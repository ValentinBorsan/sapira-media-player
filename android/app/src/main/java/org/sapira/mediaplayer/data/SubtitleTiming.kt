package org.sapira.mediaplayer.data

import java.util.Locale

internal object SubtitleTiming {
    private val timestamps = Regex(
        """(?m)^(\uFEFF?)((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})([ \t]+-->[ \t]+)((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})(?=[ \t\r\n]|$)"""
    )

    fun shift(source: String, offsetMs: Long, separator: Char): String =
        timestamps.replace(source) { match ->
            val (prefix, start, arrow, end) = match.destructured
            "$prefix${format(parse(start) + offsetMs, separator)}$arrow${format(parse(end) + offsetMs, separator)}"
        }

    private fun parse(timestamp: String): Long {
        val parts = timestamp.split(':', ',', '.')
        return parts.dropLast(1).fold(0L) { seconds, part -> seconds * 60 + part.toLong() } * 1000 +
            parts.last().toLong()
    }

    private fun format(value: Long, separator: Char): String {
        val ms = value.coerceAtLeast(0L)
        return String.format(Locale.ROOT, "%02d:%02d:%02d%c%03d", ms / 3_600_000, ms / 60_000 % 60,
            ms / 1000 % 60, separator, ms % 1000)
    }
}
