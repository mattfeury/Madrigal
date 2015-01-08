(function() {
    window.models = {};

    window.models.Genre = Backbone.Model.extend({
        defaults: {
            name: "Post Chillwave",
            description: "Like chillwave, but... newer"
        }
    })

    // Specifically, a Spotify song.
    window.models.Song = Backbone.Model.extend({
        defaults: {
            artist: "Angel Olsen",
            title: "Lights Out"
        },

        setSpotifyTrackInfo: function(spotifyTrack) {
            var image = spotifyTrack.album.images[0]

            this.set({
                imageUrl: image && image.url,
                previewUrl: spotifyTrack.preview_url
            })
        }
    }, {
        transformEchonestProps: function(json) {
            json.artist = json.artist_name

            var spotifyTrack = json.tracks[0]
            json.id = spotifyTrack && spotifyTrack.foreign_id.split(':').pop()

            delete json.artist_name
            return json
        }
    })
})();
