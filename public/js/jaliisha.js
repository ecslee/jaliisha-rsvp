var rsvpChoice;
function showRsvpOptions(guest, rsvpList) {
    $('#edit-rsvp-btn').show();
    $('#edit-rsvp').show();
    if (guest.rsvp === true) {
        $('#alerts #guest-return').show();
        $('#edit-rsvp #yes').prop('checked', true);
    } else if (guest.rsvp === false) {
        $('#alerts #guest-return').show();
        $('#edit-rsvp #no').prop('checked', true);
    } else if (Object.keys(guest.family).length > 1) {
        $('#alerts #guest-new-party').show();
    } else {
        $('#alerts #guest-new').show();
    }

    $('#edit-rsvp #rsvp-list').append(rsvpList);
    $('#edit-rsvp input[type="radio"]').click(checkForYes);
    checkForYes();
}

function checkForYes () {
    var anyYes = false;
    var radios = $('#edit-rsvp input[type="radio"][value="yes"]');
    for (var r = 0; r < radios.length; r++) {
        if (radios[r].checked) {
            anyYes = true;
            break;
        }
    }

    anyYes ? $('#edit-rsvp #diet-label').show() : $('#edit-rsvp #diet-label').hide();
}

$('#find-name-btn').click(function () {
    $('#alerts .alert:visible').hide();
    var that = this;
    console.log('find name');
    $.ajax({
        url: '/invite',
        data: {
            first: $('#first').val(),
            last: $('#last').val()
        },
        success: function (data, success, jqxhr) {
            if (data.error) {
                console.log('ERROR', data.error);
            } else if (data.guest !== null) {
                // found the guest
                $(that).hide();
                $('#find-name input').attr('disabled', true);
                $('#find-name').hide();
                showRsvpOptions(data.guest, data.rsvpList);
            } else {
                $('#alerts #guest-no').show();
                $('#find-name input').val('');
            }
        },
        error: function (jqxhr, status, errorMsg) {
            console.log('ERROR', status, errorMsg);
        }
    });
});

$('#edit-rsvp-btn').click(function () {
    $('#alerts .alert:visible').hide();

    rsvpChoice = $('input:radio[name="rsvp-option"]:checked').val();
    if (typeof rsvpChoice === 'undefined') {
        $('#alerts #rsvp-empty').show();
    } else {        
        var that = this;
        console.log('edit rsvp');
        $(that).hide();
        $('#edit-rsvp input').attr('disabled', true);
        $('#submit-btn').show();

        $('#comments textarea').show();
        if (rsvpChoice === 'yes') {
            $('#comments label').show();
        }
    }
});

$('#submit-btn').click(function () {
    $('#alerts .alert:visible').hide();
    var that = this;
    console.log('submit, done');
    $.post('/submit', {
            first: $('#first').val(),
            last: $('#last').val(),
            rsvp: $('input:radio[name="rsvp-option"]:checked').val(),
            diet: $('#comments #diet').val(),
            note: $('#comments #note').val()
        },
        function (data, success, jqxhr) {
            if (data.error) {
                console.log('ERROR', data.error);
            } else {
                $('#find-name').hide();
                $('#edit-rsvp').hide();
                $('#comments').hide();
                $('#btn-container').hide();
                if (data.rsvp) {
                    $('#alerts #success-yes').show();
                } else {
                    $('#alerts #success-no').show();
                }
            }
        }
    );
});