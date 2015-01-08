function getAudioEngine() {
    var audio = new Audio();

    var playUrl = function(url) {
        audio.setAttribute('src', url);
        audio.play();
    }

    var isPaused = function() {
        return audio.paused;
    }

    var togglePlayback = function() {
        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }

        return isPaused()
    }

    var onEventFn = function(eventName) {
        return function(callback) {
            audio.addEventListener(eventName, callback)
        }
    }

    return {
        playUrl: playUrl,
        isPaused: isPaused,
        togglePlayback: togglePlayback,

        onEnd: onEventFn("ended"),
        onPause: onEventFn("pause"),
        onPlay: onEventFn("play")
    }
}

function getSpotify() {
    var host = "https://api.spotify.com/v1/";

    var getTracks = function(ids, callback) {
        var url = host + 'tracks?ids=' + ids.join(",");

        $.getJSON(url, function(results) {
            callback(results);
        });
    }

    return {
        getTracks: getTracks
    }
}


