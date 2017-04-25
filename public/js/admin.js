$.ajax({
    url: '/rsvp-all',
    success: function (data, success, jqxhr) {
        if (data.error) {
            console.log('ERROR', data.error);
        } else {
            data.yes.forEach(function (guest, i) {
                $('#rsvp-yes-table').append('<div class="guest">' + guest.first + ' ' + guest.last + '</div>');
            });

            data.no.forEach(function (guest, i) {
                $('#rsvp-no-table').append('<div class="guest">' + guest.first + ' ' + guest.last + '</div>');
            });

            data.na.forEach(function (guest, i) {
                $('#rsvp-null-table').append('<div class="guest">' + guest.first + ' ' + guest.last + '</div>');
            });
        }
    }
});