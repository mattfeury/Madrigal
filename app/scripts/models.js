(function() {
    window.models = {};
    window.views = {};

    var CardView = Backbone.View.extend({
        tagName: "li",
        className: "card",

        render: function() {
            var template = $(this.template).html(),
                tmpl = _.template(template);

            this.$el.html(tmpl(this.model || {}));

            return this;
        }
    })

    window.views.SongCardView = CardView.extend({
        className: "song " + CardView.prototype.className,
        template: "#song-card-template"
    })
    window.views.GenreCardView = CardView.extend({
        className: "genre " + CardView.prototype.className,
        template: "#genre-card-template"
    })

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
