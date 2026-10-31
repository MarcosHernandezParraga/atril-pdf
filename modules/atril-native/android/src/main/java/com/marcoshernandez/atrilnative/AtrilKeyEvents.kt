// Copyright (c) 2026 Marcos Hernández Párraga. Licensed under the MIT License.
package com.marcoshernandez.atrilnative

import android.app.Activity
import android.view.KeyEvent
import android.widget.EditText

/**
 * Hardware keyboard / Bluetooth pedal capture. MainActivity.dispatchKeyEvent
 * calls [onKeyEvent] first (injected by the config plugin in plugin/).
 * Keys are only consumed while the reader is visible and no text field has
 * the focus, so typing always works.
 */
object AtrilKeyEvents {
  @Volatile var enabled: Boolean = false
  @Volatile var consumed: Set<String> = emptySet()
  /** Learn / test mode: report and consume every key (except Back and Home). */
  @Volatile var captureAll: Boolean = false
  @Volatile var listener: ((String, Boolean) -> Unit)? = null

  private val NEVER_CONSUMED = setOf(KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_HOME, KeyEvent.KEYCODE_APP_SWITCH, KeyEvent.KEYCODE_POWER)

  @JvmStatic
  fun onKeyEvent(activity: Activity, event: KeyEvent): Boolean {
    if (!enabled && !captureAll) return false
    if (event.keyCode in NEVER_CONSUMED) return false
    if (activity.currentFocus is EditText) return false
    val name = keyName(event)
    val wanted = captureAll || name in consumed
    if (event.action == KeyEvent.ACTION_DOWN) {
      listener?.invoke(name, event.repeatCount > 0)
    }
    return wanted
  }

  /** Converts an Android key code to the W3C-style name used by the shared code. */
  @JvmStatic
  fun keyName(event: KeyEvent): String {
    return when (event.keyCode) {
      KeyEvent.KEYCODE_DPAD_RIGHT -> "ArrowRight"
      KeyEvent.KEYCODE_DPAD_LEFT -> "ArrowLeft"
      KeyEvent.KEYCODE_DPAD_UP -> "ArrowUp"
      KeyEvent.KEYCODE_DPAD_DOWN -> "ArrowDown"
      KeyEvent.KEYCODE_PAGE_DOWN -> "PageDown"
      KeyEvent.KEYCODE_PAGE_UP -> "PageUp"
      KeyEvent.KEYCODE_SPACE -> "Space"
      KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER, KeyEvent.KEYCODE_DPAD_CENTER -> "Enter"
      KeyEvent.KEYCODE_MOVE_HOME -> "Home"
      KeyEvent.KEYCODE_MOVE_END -> "End"
      KeyEvent.KEYCODE_ESCAPE -> "Escape"
      KeyEvent.KEYCODE_TAB -> "Tab"
      KeyEvent.KEYCODE_F11 -> "F11"
      KeyEvent.KEYCODE_MEDIA_NEXT -> "MediaTrackNext"
      KeyEvent.KEYCODE_MEDIA_PREVIOUS -> "MediaTrackPrevious"
      KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_HEADSETHOOK -> "MediaPlayPause"
      KeyEvent.KEYCODE_MEDIA_PLAY -> "MediaPlay"
      KeyEvent.KEYCODE_MEDIA_PAUSE -> "MediaPause"
      KeyEvent.KEYCODE_VOLUME_UP -> "AudioVolumeUp"
      KeyEvent.KEYCODE_VOLUME_DOWN -> "AudioVolumeDown"
      else -> {
        val ch = event.unicodeChar
        if (ch > 32) {
          String(Character.toChars(ch)).uppercase()
        } else {
          KeyEvent.keyCodeToString(event.keyCode).removePrefix("KEYCODE_")
        }
      }
    }
  }
}
