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
                        $.ajax({
                            url: '/admin/rsvps',
                            success: function (data, success, jqxhr) {
                                if (data.error) {
                                    $('#alerts #error').show();
                                } else {
                                    console.log('success');
                                    $('#header').hide();
                                    $('#rsvp-form').hide();
                                    $('#rsvp-table').html(data).show();
                                    $('[data-toggle="popover"]').popover({
                                        placement: 'top',
                                        trigger: 'focus',
                                        html: true
                                    });
                                }
                            },
                            error: function (jqxhr, status, errorMsg) {
                                $('#alerts #error').show();
                            }
                        });
                    }
                }
            }
        );
    }
});

console.log('*~ WebSeitz 2017 ~*');
