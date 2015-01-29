// Yucky but Android seems super laggy
function isAndroid() {
    var userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return userAgent.match(/Android/i)
}

$(function () {
    $(document).foundation();

    $(document)
        .on('choose-genres', showGenres)
        .on('select-genre', function(event, genre) {
            onGenreSelect(genre)
        })

    var player,
        playlist = new Backbone.Collection([], { model: models.Song }),
        stack = gajus.Swing.Stack({
            isThrowOut: function(offset, element, confidence) {
                return confidence >= .5
            }
        }),


        Echonest = getEchonest(),
        Spotify = getSpotify(),
        AudioEngine = getAudioEngine();

    var genres = new Backbone.Collection([], { model: models.Genre })

    function playNextSong() {
        var nextSong = playlist.shift()

        if (! nextSong) {
            return
        }

        AudioEngine.playUrl(nextSong.get('previewUrl'))
        $('footer').text('Now Playing: ' + nextSong.get('artist') + " - " + nextSong.get('title')).show()
    }

    AudioEngine.onEnd(function() {
        playNextSong()
    })

    playlist.on('add', function() {
        if (AudioEngine.isPaused()) {
            playNextSong()
        }
    })

    function onSongSelect(song) {
        playlist.add(song)
        $('#swipe-instructions').text("Groovy! Keep swiping to add songs to the queue.")

        mixpanel.track("Select Song", song.toJSON())
    }

    function filterSongCollection(collection, prop) {
        return new Backbone.Collection(
            collection.filter(function(_) { return _.get(prop) }),
            { model: window.models.Song }
        )
    }

    function onEmptyGenre(genre) {
        $('#notice').html(new views.EmptyGenreView({ model: genre }).render().$el)
        $('body').addClass('showingNotice')
        mixpanel.track("Show Empty Genre Notice", { genre: genre.get('name') })
    }

    function getSongsForGenre(genre, playlistPreset) {
        var deferred = $.Deferred();

        Echonest.getStaticGenrePlaylist({
            genre: genre.get('name'),
            preset: playlistPreset,
            callback: function(songJsons) {
                _.each(songJsons, window.models.Song.transformEchonestProps)

                var songs = new Backbone.Collection(songJsons, { model: window.models.Song })
                songs = filterSongCollection(songs, 'id')

                var spotifyIds = songs.pluck('id')
                Spotify.getTracks(spotifyIds, function(response) {
                    _.each(response.tracks, function(track) {
                        var song = songs.get(track.id)
                        song.setSpotifyTrackInfo(track)
                    })

                    songs = filterSongCollection(songs, 'previewUrl')

                    deferred.resolve(songs)
                })
            }
        })

        return deferred.promise()
    }

    function onGenreSelect(genre) {
        mixpanel.track("Select Genre", { genre: genre.get('name') })
        var $stack = $('#stack')
        $stack.addClass('loading')

        $.when(
            getSongsForGenre(genre, Echonest.GenrePlaylistPresets.CORE_SHUFFLED),
            getSongsForGenre(genre, Echonest.GenrePlaylistPresets.IN_ROTATION_SHUFFLED)
        ).done(function(coreSongs, inRotationSongs) {
            var songs = new Backbone.Collection([], { model: window.models.Song })
            songs.add(coreSongs.models)
            songs.add(inRotationSongs.models)
            songs.reset(songs.shuffle())

            $stack.removeClass('loading')
            emptyStack()
            if (songs.length > 0) {
                addToStack(songs, window.views.SongCardView, {
                    onSelect: onSongSelect,
                    onIndecision: function() {
                        onEmptyGenre(genre)
                    }
                })
            } else {
                onEmptyGenre(genre)
            }
        })
    }

    function removeGenre(genre) {
        genres.remove(genre)
    }

    function showGenres() {
        emptyStack()
        addToStack(genres, window.views.GenreCardView, {
            onSelect: onGenreSelect,
            onDecline: removeGenre
        })
    }

    function emptyStack() {
        $('#stack .card').each(function() {
            var $card = $(this),
                card = $card.data('card')

            card.destroy()
            $card.remove()
        })
    }

    // Sucks to have to detect device, but Android gets super laggy with many cards
    var STACK_LENGTH = isAndroid() ? 7 : 20;
    function addToStack(collection, cardView, callbacks) {
        $('body').removeClass('showingNotice')
        var $stack = $('#stack');

        // Reverse the models to stack since we have to append the cards.
        // This way we honor the order of the collection
        var modelsToStack = collection.slice(0, STACK_LENGTH).reverse(),
            modelsToWait = collection.slice(STACK_LENGTH)

        _.each(modelsToStack, function(model) {
            var view = new cardView({ model: model })
            $stack.append(view.render().$el)

            var card = stack.createCard(view.el)

            view.$el.data('card', card)

            card.on('throwoutleft', function (e) {
                if (typeof callbacks.onDecline == 'function') {
                    callbacks.onDecline(model)
                }
            });

            card.on('throwoutright', function(e) {
                if (typeof callbacks.onSelect == 'function') {
                    callbacks.onSelect(model)
                }
            })

            card.on('throwoutend', function(e) {
                card.destroy()
                view.$el.remove()
                view.remove()

                if (! $('.card').length) {
                    if (modelsToWait.length) {
                        addToStack(
                            new Backbone.Collection(modelsToWait, { model: collection.model }),
                            cardView,
                            callbacks
                        )
                    } else if (typeof callbacks.onIndecision == 'function') {
                        callbacks.onIndecision(model)
                    }
                }
            })
        });
    }

    $.ajaxSettings.traditional = true;
    $.ajaxSetup({ cache: false });

    Echonest.listGenres(function(genreJsons) {
        genres.reset(genreJsons)
        genres.reset(genres.shuffle())

        var cannedGenres = _.map([
            "jazz",
            "metal",
            "neo-psychedelic",
            "indie rock",
            "classic rock",
            "pop",
            "alternative country"
        ], function(n) {
            return new models.Genre({ name: n })
        })

        genres.unshift(cannedGenres, { index: 0 })

        showGenres()
    })
});
