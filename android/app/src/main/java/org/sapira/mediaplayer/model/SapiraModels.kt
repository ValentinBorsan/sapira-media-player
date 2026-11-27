package org.sapira.mediaplayer.model

import android.net.Uri
import androidx.compose.ui.graphics.Color

enum class MediaKind {
    AUDIO,
    VIDEO
}

data class SapiraTrack(
    val id: String,
    val uri: Uri,
    val title: String,
    val artist: String = "",
    val album: String = "",
    val durationMs: Long = 0L,
    val sizeBytes: Long = 0L,
    val ext: String = "",
    val kind: MediaKind = MediaKind.AUDIO,
    val artworkUri: Uri? = null,
    val folder: String = "",
    val isRemote: Boolean = false,
    val secondaryAudioUrl: String? = null,
    val mimeType: String? = null,
    val dashManifestXml: String? = null,
    val sourceUrl: String? = null
)

data class LyricLine(
    val timeMs: Long,
    val text: String
)

data class ParsedLyrics(
    val lines: List<LyricLine>,
    val synced: Boolean,
    val sourceLabel: String
)

enum class SapiraTheme(
    val id: String,
    val label: String,
    val c0: Color,
    val c1: Color,
    val c2: Color
) {
    SAPPHIRE("sapphire", "Sapphire", Color(0xFF67E8F9), Color(0xFF6366F1), Color(0xFFC084FC)),
    AMETHYST("amethyst", "Amethyst", Color(0xFFF0ABFC), Color(0xFFA855F7), Color(0xFF6366F1)),
    EMERALD("emerald", "Emerald", Color(0xFF6EE7B7), Color(0xFF14B8A6), Color(0xFF38BDF8)),
    AMBER("amber", "Amber", Color(0xFFFDE68A), Color(0xFFF59E0B), Color(0xFFFB7185));

    companion object {
        fun fromId(id: String?): SapiraTheme = entries.find { it.id == id } ?: SAPPHIRE
    }
}

enum class SapiraLanguage(val code: String, val label: String) {
    EN("en", "English"),
    RO("ro", "Română");

    companion object {
        fun fromCode(code: String?): SapiraLanguage = entries.find { it.code == code } ?: EN
    }
}

data class SapiraStrings(
    val stageTab: String,
    val libraryTab: String,
    val queueTab: String,
    val settingsTitle: String,
    val emptyTitle: String,
    val emptySubtitle: String,
    val openFiles: String,
    val openStream: String,
    val enterFullscreen: String,
    val exitFullscreen: String,
    val libraryTitleSort: String,
    val libraryArtistSort: String,
    val libraryAlbumGroup: String,
    val libraryFolderGroup: String,
    val unknownGroup: String,
    val lockControls: String,
    val unlockControls: String,
    val savedPlaylists: String,
    val saveQueue: String,
    val playlistName: String,
    val deletePlaylist: String,
    val reorderTrack: String,
    val savePlaylist: String,
    val subtitleDelay: String,
    val resumePlayback: String,
    val startOver: String,
    val trackPicker: String,
    val videoQuality: String,
    val audioTracks: String,
    val subtitleTracks: String,
    val automaticTrack: String,
    val subtitlesOff: String,
    val openSubtitleFile: String,
    val unsupportedSubtitleFile: String,
    val scanLibrary: String,
    val grantPermission: String,
    val permissionHint: String,
    val searchPlaceholder: String,
    val allFilter: String,
    val audioFilter: String,
    val videoFilter: String,
    val lyricsLabel: String,
    val fetchOnline: String,
    val loadLrc: String,
    val noLyricsYet: String,
    val equalizerLabel: String,
    val loudnessBoost: String,
    val sleepTimer: String,
    val themeLabel: String,
    val languageLabel: String,
    val queueEmpty: String,
    val clearQueue: String,
    val streamDialogTitle: String,
    val streamUrlHint: String,
    val streamAudioOnly: String,
    val resolvingStream: String,
    val youtubeEmbedNote: String,
    val invalidStreamUrl: String,
    val playNow: String,
    val cancel: String,
    val signalActive: String,
    val signalStandby: String
)

object SapiraI18n {
    private val EN = SapiraStrings(
        stageTab = "Stage",
        libraryTab = "Library",
        queueTab = "Queue",
        settingsTitle = "Audio FX & Settings",
        emptyTitle = "SAPIRA SANCTUARY",
        emptySubtitle = "Pure, distraction-free audio & cinema player. Open local files, browse your device library, or play an HLS / radio stream.",
        openFiles = "Open Files",
        openStream = "Network Stream",
        enterFullscreen = "Enter fullscreen",
        exitFullscreen = "Exit fullscreen",
        libraryTitleSort = "Title",
        libraryArtistSort = "Artist",
        libraryAlbumGroup = "Album",
        libraryFolderGroup = "Folder",
        unknownGroup = "Unknown",
        lockControls = "Lock controls",
        unlockControls = "Unlock controls",
        savedPlaylists = "Saved playlists",
        saveQueue = "Save queue",
        playlistName = "Playlist name",
        deletePlaylist = "Delete playlist",
        reorderTrack = "Reorder track",
        savePlaylist = "Save",
        subtitleDelay = "Subtitle delay",
        resumePlayback = "Resume playback",
        startOver = "Start over",
        trackPicker = "Quality, audio & subtitles",
        videoQuality = "Video quality",
        audioTracks = "Audio tracks",
        subtitleTracks = "Subtitles",
        automaticTrack = "Automatic",
        subtitlesOff = "Off",
        openSubtitleFile = "Open .srt or .vtt",
        unsupportedSubtitleFile = "Choose an SRT or VTT subtitle file.",
        scanLibrary = "Refresh Library",
        grantPermission = "Allow Media Access",
        permissionHint = "Grant permission to browse music and videos stored on your device, or use Open Files without permissions.",
        searchPlaceholder = "Search tracks, artists, formats…",
        allFilter = "All",
        audioFilter = "Audio",
        videoFilter = "Video",
        lyricsLabel = "LYRICS",
        fetchOnline = "Online",
        loadLrc = ".LRC",
        noLyricsYet = "No lyrics loaded yet. Tap Online (LRCLIB) or load a local .LRC file.",
        equalizerLabel = "5-Band Equalizer",
        loudnessBoost = "Volume Boost",
        sleepTimer = "Sleep Timer",
        themeLabel = "Prism Theme",
        languageLabel = "Language",
        queueEmpty = "Your playback queue is empty.",
        clearQueue = "Clear",
        streamDialogTitle = "YouTube & Network Stream",
        streamUrlHint = "https://… (YouTube, .m3u8, .mp3, .mp4, radio)",
        streamAudioOnly = "Audio only (background music)",
        resolvingStream = "Extracting YouTube stream…",
        youtubeEmbedNote = "Official YouTube Player · Google Play edition",
        invalidStreamUrl = "Enter a valid YouTube or HTTPS stream URL.",
        playNow = "Play Stream",
        cancel = "Cancel",
        signalActive = "SIGNAL · ACTIVE",
        signalStandby = "SIGNAL · STANDBY"
    )

    private val RO = SapiraStrings(
        stageTab = "Scenă",
        libraryTab = "Bibliotecă",
        queueTab = "Coadă",
        settingsTitle = "Audio FX & Setări",
        emptyTitle = "SAPIRA SANCTUARY",
        emptySubtitle = "Player audio & video minimalist, fără distrageri. Deschide fișiere locale, explorează biblioteca telefonului sau redă un stream HLS / radio.",
        openFiles = "Deschide Fișiere",
        openStream = "Stream Rețea",
        enterFullscreen = "Intră în ecran complet",
        exitFullscreen = "Ieși din ecran complet",
        libraryTitleSort = "Titlu",
        libraryArtistSort = "Artist",
        libraryAlbumGroup = "Album",
        libraryFolderGroup = "Dosar",
        unknownGroup = "Necunoscut",
        lockControls = "Blochează comenzile",
        unlockControls = "Deblochează comenzile",
        savedPlaylists = "Playlisturi salvate",
        saveQueue = "Salvează coada",
        playlistName = "Numele playlistului",
        deletePlaylist = "Șterge playlistul",
        reorderTrack = "Reordonează pista",
        savePlaylist = "Salvează",
        subtitleDelay = "Decalaj subtitrare",
        resumePlayback = "Continuă redarea",
        startOver = "Pornește de la început",
        trackPicker = "Calitate, audio și subtitrări",
        videoQuality = "Calitate video",
        audioTracks = "Piste audio",
        subtitleTracks = "Subtitrări",
        automaticTrack = "Automat",
        subtitlesOff = "Dezactivate",
        openSubtitleFile = "Deschide .srt sau .vtt",
        unsupportedSubtitleFile = "Alege un fișier de subtitrare SRT sau VTT.",
        scanLibrary = "Actualizează",
        grantPermission = "Permite Acces Media",
        permissionHint = "Acordă acces pentru a afișa muzica și clipurile de pe dispozitiv sau folosește Deschide Fișiere fără permisiuni.",
        searchPlaceholder = "Caută piese, artiști, formate…",
        allFilter = "Toate",
        audioFilter = "Audio",
        videoFilter = "Video",
        lyricsLabel = "VERSURI",
        fetchOnline = "Online",
        loadLrc = ".LRC",
        noLyricsYet = "Niciun vers încărcat. Apasă Online (LRCLIB) sau încarcă un fișier .LRC.",
        equalizerLabel = "Egalizator 5 Benzi",
        loudnessBoost = "Amplificare Volum",
        sleepTimer = "Temporizator Somn",
        themeLabel = "Temă Prism",
        languageLabel = "Limbă",
        queueEmpty = "Coada de redare este goală.",
        clearQueue = "Golește",
        streamDialogTitle = "YouTube & Stream Rețea",
        streamUrlHint = "https://… (YouTube, .m3u8, .mp3, .mp4, radio)",
        streamAudioOnly = "Doar audio (muzică în fundal)",
        resolvingStream = "Se extrage fluxul YouTube…",
        youtubeEmbedNote = "Player oficial YouTube · ediția Google Play",
        invalidStreamUrl = "Introdu un link YouTube sau HTTPS valid.",
        playNow = "Redă Stream",
        cancel = "Anulează",
        signalActive = "SEMNAL · ACTIV",
        signalStandby = "SEMNAL · AȘTEPTARE"
    )

    fun strings(lang: SapiraLanguage): SapiraStrings = when (lang) {
        SapiraLanguage.EN -> EN
        SapiraLanguage.RO -> RO
    }
}

enum class EqPreset(val id: String, val label: String, val gainsDb: List<Float>) {
    FLAT("flat", "Flat", listOf(0f, 0f, 0f, 0f, 0f)),
    BASS_BOOST("bass", "Bass", listOf(6f, 4.5f, 0f, -1f, 1f)),
    VOCAL("vocal", "Vocal", listOf(-2f, 1f, 4.5f, 3.5f, 1f)),
    CINEMA("cinema", "Cinema", listOf(5f, 2.5f, -1f, 3f, 4.5f)),
    TREBLE("treble", "Sparkle", listOf(-1f, 0f, 2f, 4.5f, 6f));

    companion object {
        fun fromId(id: String?): EqPreset = entries.find { it.id == id } ?: FLAT
    }
}

enum class SleepTimerOption(val minutes: Int, val label: String, val endOfTrack: Boolean = false) {
    OFF(0, "Off"),
    MIN_15(15, "15m"),
    MIN_30(30, "30m"),
    MIN_45(45, "45m"),
    MIN_60(60, "60m"),
    END_OF_TRACK(-1, "End of Track", endOfTrack = true)
}

enum class VideoAspectMode(val label: String) {
    FIT("Fit"),
    FILL("Zoom"),
    STRETCH("Stretch")
}
