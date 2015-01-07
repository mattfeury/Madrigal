(function() {
    window.models = {};

    window.models.Genre = Backbone.Model.extend({
        defaults: {
            name: "Post Chillwave",
            description: "Like chillwave, but... newer"
        }
    })

    window.models.Song = Backbone.Model.extend({
        defaults: {
            artist: "Angel Olsen",
            title: "Lights Out"
        }
    }, {
        transformEchonestProps: function(json) {
            json.artist = json.artist_name
            json.name = json.title
            delete json.artist_name
            return json
        }
    })
})();
