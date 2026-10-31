// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
package com.marcoshernandez.atrilnative

import android.os.Build
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AtrilNativeModule : Module() {
  private val store by lazy {
    PdfDocumentStore(appContext.reactContext ?: throw IllegalStateException("No context"))
  }

  private fun <T> guard(block: () -> T): T {
    try {
      return block()
    } catch (e: PdfPasswordException) {
      throw CodedException("ERR_PDF_PASSWORD", "password", e)
    } catch (e: PdfMissingException) {
      throw CodedException("ERR_PDF_MISSING", "missing", e)
    } catch (e: OutOfMemoryError) {
      throw CodedException("ERR_PDF_MEMORY", "out of memory", null)
    } catch (e: CodedException) {
      throw e
    } catch (e: Exception) {
      throw CodedException("ERR_PDF_INVALID", e.message ?: "invalid", e)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("AtrilNative")

    Constants(
      "platform" to "android",
      "sdkInt" to Build.VERSION.SDK_INT,
      "canSearch" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM),
      "canOpenProtected" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM),
      "canReadOutline" to false,
      "supportsVolumeKeys" to true,
    )

    Events("onKey")

    OnCreate {
      AtrilKeyEvents.listener = { key, repeat ->
        sendEvent("onKey", mapOf("key" to key, "repeat" to repeat, "time" to System.nanoTime() / 1_000_000.0))
      }
    }

    OnDestroy {
      AtrilKeyEvents.listener = null
      AtrilKeyEvents.enabled = false
      store.closeAll()
    }

    AsyncFunction("openDocument") { path: String, password: String? ->
      guard {
        val (handle, doc) = store.open(path, password)
        mapOf("handle" to handle, "pageCount" to doc.renderer.pageCount, "sizes" to doc.sizes.map { it.toDouble() })
      }
    }

    AsyncFunction("renderPage") { handle: String, pageIndex: Int, widthPx: Int ->
      guard {
        val (uri, w, h) = store.render(handle, pageIndex, widthPx)
        mapOf("uri" to uri, "width" to w, "height" to h)
      }
    }

    AsyncFunction("renderPageGray") { handle: String, pageIndex: Int, widthPx: Int ->
      guard { store.renderGray(handle, pageIndex, widthPx) }
    }

    AsyncFunction("searchText") { handle: String, query: String ->
      guard { store.searchText(handle, query) }
    }

    AsyncFunction("getOutline") { _: String ->
      emptyList<Map<String, Any>>()
    }

    AsyncFunction("closeDocument") { handle: String ->
      store.close(handle)
    }

    Function("setKeyCapture") { enabled: Boolean, keys: List<String>, captureAll: Boolean ->
      AtrilKeyEvents.consumed = keys.toSet()
      AtrilKeyEvents.captureAll = captureAll
      AtrilKeyEvents.enabled = enabled
    }
  }
}
