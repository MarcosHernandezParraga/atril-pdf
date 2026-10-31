// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
import CryptoKit
import ExpoModulesCore
import PDFKit
import UIKit

final class PdfPasswordException: Exception {
  override var code: String { "ERR_PDF_PASSWORD" }
  override var reason: String { "password" }
}

final class PdfMissingException: Exception {
  override var code: String { "ERR_PDF_MISSING" }
  override var reason: String { "missing" }
}

final class PdfInvalidException: Exception {
  override var code: String { "ERR_PDF_INVALID" }
  override var reason: String { "invalid" }
}

/// Open documents (PDFKit). Access is serialised per document.
final class PdfStore {
  final class Doc {
    let document: PDFDocument
    let fingerprint: String
    let sizes: [Double]
    let lock = NSLock()
    init(document: PDFDocument, fingerprint: String, sizes: [Double]) {
      self.document = document
      self.fingerprint = fingerprint
      self.sizes = sizes
    }
  }

  private var docs: [String: Doc] = [:]
  private let docsLock = NSLock()

  lazy var cacheDir: URL = {
    let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("atril-render", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }()

  func open(path: String, password: String?) throws -> (String, Doc) {
    let url = path.hasPrefix("file://") ? URL(string: path)! : URL(fileURLWithPath: path)
    guard FileManager.default.fileExists(atPath: url.path) else { throw PdfMissingException() }
    guard let document = PDFDocument(url: url) else { throw PdfInvalidException() }
    if document.isLocked {
      guard let pw = password, document.unlock(withPassword: pw) else { throw PdfPasswordException() }
    }
    var sizes: [Double] = []
    for i in 0..<document.pageCount {
      guard let page = document.page(at: i) else {
        sizes.append(contentsOf: [595, 842])
        continue
      }
      let box = page.bounds(for: .cropBox)
      let rotated = page.rotation % 180 != 0
      sizes.append(Double(rotated ? box.height : box.width))
      sizes.append(Double(rotated ? box.width : box.height))
    }
    let attrs = try? FileManager.default.attributesOfItem(atPath: url.path)
    let size = (attrs?[.size] as? NSNumber)?.int64Value ?? 0
    let mtime = (attrs?[.modificationDate] as? Date)?.timeIntervalSince1970 ?? 0
    let digest = Insecure.SHA1.hash(data: Data("\(url.path):\(size):\(mtime)".utf8))
    let fingerprint = digest.map { String(format: "%02x", $0) }.joined().prefix(16)
    let doc = Doc(document: document, fingerprint: String(fingerprint), sizes: sizes)
    let handle = UUID().uuidString
    docsLock.lock()
    docs[handle] = doc
    docsLock.unlock()
    return (handle, doc)
  }

  func get(_ handle: String) throws -> Doc {
    docsLock.lock()
    defer { docsLock.unlock() }
    guard let d = docs[handle] else { throw PdfMissingException() }
    return d
  }

  func close(_ handle: String) {
    docsLock.lock()
    docs.removeValue(forKey: handle)
    docsLock.unlock()
  }

  private func targetSize(_ doc: Doc, _ index: Int, _ widthPx: Int) throws -> (Int, Int) {
    guard index >= 0, index < doc.document.pageCount else { throw PdfInvalidException() }
    let w = max(16, min(4096, widthPx))
    let pw = doc.sizes[index * 2]
    let ph = doc.sizes[index * 2 + 1]
    let h = max(16, min(6144, Int(Double(w) * ph / pw)))
    return (w, h)
  }

  private func draw(_ doc: Doc, _ index: Int, _ w: Int, _ h: Int) throws -> UIImage {
    doc.lock.lock()
    defer { doc.lock.unlock() }
    guard let page = doc.document.page(at: index) else { throw PdfInvalidException() }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let size = CGSize(width: w, height: h)
    let thumb = page.thumbnail(of: size, for: .cropBox)
    return UIGraphicsImageRenderer(size: size, format: format).image { ctx in
      UIColor.white.setFill()
      ctx.fill(CGRect(origin: .zero, size: size))
      thumb.draw(in: CGRect(origin: .zero, size: size))
    }
  }

  func render(_ handle: String, _ index: Int, _ widthPx: Int) throws -> [String: Any] {
    let doc = try get(handle)
    let (w, h) = try targetSize(doc, index, widthPx)
    let out = cacheDir.appendingPathComponent("\(doc.fingerprint)-\(index)-\(w).png")
    if FileManager.default.fileExists(atPath: out.path) {
      try? FileManager.default.setAttributes([.modificationDate: Date()], ofItemAtPath: out.path)
      return ["uri": out.absoluteString, "width": w, "height": h]
    }
    let image = try draw(doc, index, w, h)
    guard let data = image.pngData() else { throw PdfInvalidException() }
    try data.write(to: out, options: .atomic)
    return ["uri": out.absoluteString, "width": w, "height": h]
  }

  func renderGray(_ handle: String, _ index: Int, _ widthPx: Int) throws -> Data {
    let doc = try get(handle)
    let (w, h) = try targetSize(doc, index, widthPx)
    let image = try draw(doc, index, w, h)
    var out = Data(count: 8 + w * h)
    guard let cg = image.cgImage else { throw PdfInvalidException() }
    let gray = CGColorSpaceCreateDeviceGray()
    var pixels = [UInt8](repeating: 255, count: w * h)
    pixels.withUnsafeMutableBytes { buf in
      if let ctx = CGContext(
        data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
        space: gray, bitmapInfo: CGImageAlphaInfo.none.rawValue)
      {
        ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
      }
    }
    out.withUnsafeMutableBytes { raw in
      let p = raw.bindMemory(to: UInt8.self)
      for (i, v) in withUnsafeBytes(of: UInt32(w).littleEndian, Array.init).enumerated() { p[i] = v }
      for (i, v) in withUnsafeBytes(of: UInt32(h).littleEndian, Array.init).enumerated() { p[4 + i] = v }
      for i in 0..<(w * h) { p[8 + i] = pixels[i] }
    }
    return out
  }

  func outline(_ handle: String) throws -> [[String: Any]] {
    let doc = try get(handle)
    func convert(_ node: PDFOutline) -> [String: Any] {
      var children: [[String: Any]] = []
      for i in 0..<node.numberOfChildren {
        if let c = node.child(at: i) { children.append(convert(c)) }
      }
      var pageIndex: Any = NSNull()
      if let page = node.destination?.page {
        pageIndex = doc.document.index(for: page)
      }
      return ["title": node.label ?? "", "pageIndex": pageIndex, "children": children]
    }
    guard let root = doc.document.outlineRoot else { return [] }
    return (0..<root.numberOfChildren).compactMap { root.child(at: $0) }.map(convert)
  }

  func search(_ handle: String, _ query: String) throws -> [[String: Int]] {
    let doc = try get(handle)
    doc.lock.lock()
    defer { doc.lock.unlock() }
    var counts: [Int: Int] = [:]
    for sel in doc.document.findString(query, withOptions: [.caseInsensitive, .diacriticInsensitive]) {
      for page in sel.pages {
        let i = doc.document.index(for: page)
        counts[i, default: 0] += 1
      }
    }
    return counts.keys.sorted().map { ["pageIndex": $0, "count": counts[$0]!] }
  }
}

/// Invisible first responder that receives hardware keyboard / Bluetooth pedal presses.
final class KeyCaptureView: UIView {
  var onKey: ((String, Bool) -> Void)?
  var consumed: Set<String> = []
  var captureAll = false
  private var lastCommand: (String, TimeInterval) = ("", 0)

  override var canBecomeFirstResponder: Bool { true }

  override var keyCommands: [UIKeyCommand]? {
    let inputs = [UIKeyCommand.inputRightArrow, UIKeyCommand.inputLeftArrow, UIKeyCommand.inputUpArrow, UIKeyCommand.inputDownArrow, UIKeyCommand.inputPageUp, UIKeyCommand.inputPageDown]
    return inputs.map { input in
      let cmd = UIKeyCommand(input: input, modifierFlags: [], action: #selector(handleCommand(_:)))
      if #available(iOS 15.0, *) { cmd.wantsPriorityOverSystemBehavior = true }
      return cmd
    }
  }

  @objc private func handleCommand(_ cmd: UIKeyCommand) {
    let name: String
    switch cmd.input {
    case UIKeyCommand.inputRightArrow: name = "ArrowRight"
    case UIKeyCommand.inputLeftArrow: name = "ArrowLeft"
    case UIKeyCommand.inputUpArrow: name = "ArrowUp"
    case UIKeyCommand.inputDownArrow: name = "ArrowDown"
    case UIKeyCommand.inputPageUp: name = "PageUp"
    case UIKeyCommand.inputPageDown: name = "PageDown"
    default: return
    }
    emit(name, repeat: false)
  }

  private func emit(_ name: String, repeat: Bool) {
    let now = ProcessInfo.processInfo.systemUptime
    // A key command and pressesBegan may both report the same press.
    if lastCommand.0 == name && now - lastCommand.1 < 0.04 { return }
    lastCommand = (name, now)
    onKey?(name, repeat)
  }

  override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
    var handled = false
    for press in presses {
      guard let key = press.key else { continue }
      let name = KeyCaptureView.keyName(key)
      emit(name, repeat: false)
      if captureAll || consumed.contains(name) { handled = true }
    }
    if !handled { super.pressesBegan(presses, with: event) }
  }

  static func keyName(_ key: UIKey) -> String {
    switch key.keyCode {
    case .keyboardRightArrow: return "ArrowRight"
    case .keyboardLeftArrow: return "ArrowLeft"
    case .keyboardUpArrow: return "ArrowUp"
    case .keyboardDownArrow: return "ArrowDown"
    case .keyboardPageDown: return "PageDown"
    case .keyboardPageUp: return "PageUp"
    case .keyboardSpacebar: return "Space"
    case .keyboardReturnOrEnter, .keypadEnter: return "Enter"
    case .keyboardHome: return "Home"
    case .keyboardEnd: return "End"
    case .keyboardEscape: return "Escape"
    case .keyboardTab: return "Tab"
    case .keyboardF11: return "F11"
    default:
      let chars = key.charactersIgnoringModifiers
      if !chars.isEmpty, chars.unicodeScalars.allSatisfy({ $0.value > 32 }) { return chars.uppercased() }
      return "Key\(key.keyCode.rawValue)"
    }
  }
}

public class AtrilNativeModule: Module {
  private let store = PdfStore()
  private var captureView: KeyCaptureView?
  private var observers: [NSObjectProtocol] = []

  public func definition() -> ModuleDefinition {
    Name("AtrilNative")

    Constants([
      "platform": "ios",
      "sdkInt": 0,
      "canSearch": true,
      "canOpenProtected": true,
      "canReadOutline": true,
      "supportsVolumeKeys": false,
    ])

    Events("onKey")

    AsyncFunction("openDocument") { (path: String, password: String?) -> [String: Any] in
      let (handle, doc) = try self.store.open(path: path, password: password)
      return ["handle": handle, "pageCount": doc.document.pageCount, "sizes": doc.sizes]
    }

    AsyncFunction("renderPage") { (handle: String, pageIndex: Int, widthPx: Int) -> [String: Any] in
      try self.store.render(handle, pageIndex, widthPx)
    }

    AsyncFunction("renderPageGray") { (handle: String, pageIndex: Int, widthPx: Int) -> Data in
      try self.store.renderGray(handle, pageIndex, widthPx)
    }

    AsyncFunction("searchText") { (handle: String, query: String) -> [[String: Int]] in
      try self.store.search(handle, query)
    }

    AsyncFunction("getOutline") { (handle: String) -> [[String: Any]] in
      try self.store.outline(handle)
    }

    AsyncFunction("closeDocument") { (handle: String) in
      self.store.close(handle)
    }

    Function("setKeyCapture") { (enabled: Bool, keys: [String], captureAll: Bool) in
      DispatchQueue.main.async {
        self.updateCapture(enabled: enabled || captureAll, keys: Set(keys), captureAll: captureAll)
      }
    }

    OnDestroy {
      DispatchQueue.main.async { self.updateCapture(enabled: false, keys: [], captureAll: false) }
    }
  }

  private func keyWindow() -> UIWindow? {
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0.isKeyWindow }
  }

  private func updateCapture(enabled: Bool, keys: Set<String>, captureAll: Bool) {
    if !enabled {
      captureView?.resignFirstResponder()
      captureView?.removeFromSuperview()
      captureView = nil
      observers.forEach { NotificationCenter.default.removeObserver($0) }
      observers = []
      return
    }
    let view = captureView ?? KeyCaptureView(frame: .zero)
    view.consumed = keys
    view.captureAll = captureAll
    view.onKey = { [weak self] name, rep in
      self?.sendEvent("onKey", ["key": name, "repeat": rep, "time": ProcessInfo.processInfo.systemUptime * 1000])
    }
    if view.superview == nil, let window = keyWindow() {
      view.isUserInteractionEnabled = false
      window.addSubview(view)
    }
    captureView = view
    view.becomeFirstResponder()
    if observers.isEmpty {
      // When a text field stops editing, take the keys back so the pedal keeps working.
      for name in [UITextField.textDidEndEditingNotification, UITextView.textDidEndEditingNotification] {
        observers.append(
          NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { self?.captureView?.becomeFirstResponder() }
          })
      }
    }
  }
}
