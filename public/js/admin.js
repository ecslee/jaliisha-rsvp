function getRSVPTable() {
    $.ajax({
        url: '/admin/rsvps',
        success: function (data, success, jqxhr) {
            if (data.error) {
                $('#alerts #error').show();
            } else {
                console.log('success');
                $('#rsvp-table').html(data).show();
            }
        },
        error: function (jqxhr, status, errorMsg) {
            $('#alerts #error').show();
        }
    });
}

$('#submit-btn').click(function () {
    var password = $('#password').val().trim();

    if (password) {
        $('#alerts .alert').hide();
        
        $.post('/admin/auth', {
                password: password
            },
            function (data, success, jqxhr) {
                if (data.error) {
                    $('#alerts #error').show();
                } else {
                    if (!data.auth) {
                        $('#alerts #auth-no').show();
                    } else {
                        $('#header').hide();
                        $('#rsvp-form').hide();
                        getRSVPTable();
                        $('#refresh').show();
                        $('[data-toggle="popover"]').popover({
                            placement: 'top',
                            trigger: 'focus',
                            html: true
                        });
                    }
                }
            }
        );
    }
});

$('#find-name').keypress(function (evt) {
    if (evt.which === 13) {
        $('#submit-btn').click();
    }
});

$('#refresh').click(getRSVPTable);

console.log('*~ WebSeitz 2017 ~*');
