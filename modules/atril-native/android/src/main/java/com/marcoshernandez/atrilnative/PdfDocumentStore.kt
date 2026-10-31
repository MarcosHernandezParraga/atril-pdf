// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
package com.marcoshernandez.atrilnative

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.LoadParams
import android.graphics.pdf.PdfRenderer
import android.os.Build
import android.os.ParcelFileDescriptor
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class PdfPasswordException : Exception("password")
class PdfInvalidException(message: String?) : Exception(message ?: "invalid")
class PdfMissingException : Exception("missing")

/**
 * Keeps the open PDF documents. android.graphics.pdf.PdfRenderer can only have
 * ONE page open at a time, so every access to a renderer is serialised with
 * `synchronized(doc)`.
 */
class PdfDocumentStore(private val context: Context) {
  class Doc(
    val file: File,
    val fingerprint: String,
    val pfd: ParcelFileDescriptor,
    val renderer: PdfRenderer,
    val sizes: FloatArray,
  )

  private val docs = ConcurrentHashMap<String, Doc>()

  private val cacheDir: File by lazy {
    File(context.cacheDir, "atril-render").apply { mkdirs() }
  }

  fun open(path: String, password: String?): Pair<String, Doc> {
    val file = File(path.removePrefix("file://"))
    if (!file.exists()) throw PdfMissingException()
    val pfd = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    val renderer = try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM && !password.isNullOrEmpty()) {
        PdfRenderer(pfd, LoadParams.Builder().setPassword(password).build())
      } else {
        PdfRenderer(pfd)
      }
    } catch (e: SecurityException) {
      pfd.close()
      throw PdfPasswordException()
    } catch (e: Exception) {
      pfd.close()
      throw PdfInvalidException(e.message)
    }
    val count = renderer.pageCount
    val sizes = FloatArray(count * 2)
    synchronized(renderer) {
      for (i in 0 until count) {
        renderer.openPage(i).use { page ->
          sizes[i * 2] = page.width.toFloat()
          sizes[i * 2 + 1] = page.height.toFloat()
        }
      }
    }
    val fingerprint = sha1("${file.absolutePath}:${file.length()}:${file.lastModified()}")
    val doc = Doc(file, fingerprint, pfd, renderer, sizes)
    val handle = UUID.randomUUID().toString()
    docs[handle] = doc
    trimCache()
    return handle to doc
  }

  private fun get(handle: String): Doc = docs[handle] ?: throw PdfMissingException()

  /** Renders a page to a PNG file in the cache (reused when already rendered at that width). */
  fun render(handle: String, pageIndex: Int, widthPx: Int): Triple<String, Int, Int> {
    val doc = get(handle)
    val (w, h) = targetSize(doc, pageIndex, widthPx)
    val out = File(cacheDir, "${doc.fingerprint}-$pageIndex-$w.png")
    if (out.exists() && out.length() > 0) {
      out.setLastModified(System.currentTimeMillis())
      return Triple("file://${out.absolutePath}", w, h)
    }
    val bitmap = drawPage(doc, pageIndex, w, h)
    val tmp = File(cacheDir, "${out.name}.tmp")
    FileOutputStream(tmp).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    bitmap.recycle()
    tmp.renameTo(out)
    return Triple("file://${out.absolutePath}", w, h)
  }

  /** Small grayscale rendering. Bytes 0-3: width, 4-7: height (little endian), then one byte per pixel. */
  fun renderGray(handle: String, pageIndex: Int, widthPx: Int): ByteArray {
    val doc = get(handle)
    val (w, h) = targetSize(doc, pageIndex, widthPx)
    val bitmap = drawPage(doc, pageIndex, w, h)
    val pixels = IntArray(w * h)
    bitmap.getPixels(pixels, 0, w, 0, 0, w, h)
    bitmap.recycle()
    val out = ByteArray(8 + w * h)
    writeIntLE(out, 0, w)
    writeIntLE(out, 4, h)
    for (i in pixels.indices) {
      val c = pixels[i]
      val r = (c shr 16) and 0xFF
      val g = (c shr 8) and 0xFF
      val b = c and 0xFF
      out[8 + i] = ((r * 299 + g * 587 + b * 114) / 1000).toByte()
    }
    return out
  }

  fun searchText(handle: String, query: String): List<Map<String, Int>>? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) return null
    val doc = get(handle)
    val hits = mutableListOf<Map<String, Int>>()
    synchronized(doc.renderer) {
      for (i in 0 until doc.renderer.pageCount) {
        doc.renderer.openPage(i).use { page ->
          val n = page.searchText(query).size
          if (n > 0) hits.add(mapOf("pageIndex" to i, "count" to n))
        }
      }
    }
    return hits
  }

  fun close(handle: String) {
    val doc = docs.remove(handle) ?: return
    synchronized(doc.renderer) {
      try {
        doc.renderer.close()
      } catch (_: Exception) {
      }
      try {
        doc.pfd.close()
      } catch (_: Exception) {
      }
    }
  }

  fun closeAll() {
    docs.keys.toList().forEach { close(it) }
  }

  private fun targetSize(doc: Doc, pageIndex: Int, widthPx: Int): Pair<Int, Int> {
    if (pageIndex < 0 || pageIndex >= doc.renderer.pageCount) throw PdfInvalidException("page out of range")
    val pw = doc.sizes[pageIndex * 2]
    val ph = doc.sizes[pageIndex * 2 + 1]
    val w = widthPx.coerceIn(16, 4096)
    val h = (w * ph / pw).toInt().coerceIn(16, 6144)
    return w to h
  }

  private fun drawPage(doc: Doc, pageIndex: Int, w: Int, h: Int): Bitmap {
    val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    bitmap.eraseColor(Color.WHITE)
    synchronized(doc.renderer) {
      doc.renderer.openPage(pageIndex).use { page ->
        page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
      }
    }
    return bitmap
  }

  /** Keeps the render cache under ~300 MB, deleting the least recently used files. */
  private fun trimCache(limitBytes: Long = 300L * 1024 * 1024) {
    val files = cacheDir.listFiles()?.filter { it.isFile } ?: return
    var total = files.sumOf { it.length() }
    if (total <= limitBytes) return
    for (f in files.sortedBy { it.lastModified() }) {
      total -= f.length()
      f.delete()
      if (total <= limitBytes * 0.8) break
    }
  }

  private fun writeIntLE(buf: ByteArray, offset: Int, value: Int) {
    buf[offset] = (value and 0xFF).toByte()
    buf[offset + 1] = ((value shr 8) and 0xFF).toByte()
    buf[offset + 2] = ((value shr 16) and 0xFF).toByte()
    buf[offset + 3] = ((value shr 24) and 0xFF).toByte()
  }

  private fun sha1(s: String): String =
    MessageDigest.getInstance("SHA-1").digest(s.toByteArray()).joinToString("") { "%02x".format(it) }.take(16)
}
