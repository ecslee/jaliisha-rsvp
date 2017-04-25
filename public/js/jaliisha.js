var rsvpChoice;
function showRsvpOptions(guests, rsvpList) {
    $('#edit-rsvp #rsvp-list').append(rsvpList);
    guests.forEach(function (el, i) {
        if (el.rsvp === true) {
            $('#rsvp-option-' + el.first + '[value="yes"]').click();
        } else if (el.rsvp === false) {
            $('#rsvp-option-' + el.first + '[value="no"]').click();
        }
    });
    
    if (guests.length > 1) {
        $('#alerts #guest-new-party').show();
    } else {
        $('#alerts #guest-new').show();
    }
    
    $('#edit-rsvp input[type="radio"]').click(checkForYes);
    checkForYes();
    
    $('#submit-btn').show();
    $('#edit-rsvp').show();
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

    anyYes ? $('#edit-rsvp').find('#diet-label, #diet').show() : $('#edit-rsvp').find('#diet-label, #diet').hide();
}

$('#find-name-btn').click(function () {
    var first = $('#first').val(),
        last = $('#last').val();
    console.log('RSVP CALL    [find name] ' + last + ', ' + first);
    
    $('#alerts .alert:visible').hide();
    var that = this;
    $.ajax({
        url: '/invite',
        data: {
            first: first,
            last: last
        },
        success: function (data, success, jqxhr) {
            if (data.error) {
                console.log('RSVP ERROR   [find name] ' + last + ', ' + first + ' - ' + data.error);
            } else if (data.guests !== null) {
                console.log('RSVP SUCCESS [find name] ' + last + ', ' + first + ' - family: ' + data.guests[0].family);
                
                // found the guest
                $(that).hide();
                $('#find-name input').attr('disabled', true);
                $('#find-name').hide();
                showRsvpOptions(data.guests, data.rsvpList);
            } else {
                console.log('RSVP WARNING [find name] ' + last + ', ' + first + ' - not found');
                $('#alerts #guest-no').show();
                $('#find-name input').val('');
            }
        },
        error: function (jqxhr, status, errorMsg) {
            console.log('RSVP ERROR   [find name] ' + last + ', ' + first + ' - ' + status + ': ' + errorMsg);
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
    
    var rsvps = [];
    $('.rsvp-guest').each(function (i, el) {
        var first = $(this).data('first'),
            last = $(this).data('last'),
            rsvp = $(this).find('input:radio:checked').val();
        console.log('RSVP CALL    [rsvp done] ' + last + ', ' + first + ' - ' + rsvp);
        rsvps.push({
            first: first,
            last: last,
            rsvp: rsvp,
        });
    });
    
    var diet = $('#edit-rsvp #diet').val(),
        note = $('#edit-rsvp #note').val()
    console.log('RSVP CALL    [rsvp done] ' + rsvps[0].last + ', ' + rsvps[0].first + ' - diet: ' + diet);
    console.log('RSVP CALL    [rsvp done] ' + rsvps[0].last + ', ' + rsvps[0].first + ' - note: ' + note);
    
    $.post('/submit', {
            rsvps: rsvps,
            diet: diet,
            note: note
        },
        function (data, success, jqxhr) {
            if (data.error) {
                console.log('RSVP ERROR   [rsvp done] ' + rsvps[0].last + ', ' + rsvps[0].first + ' - ' + data.error);
            } else {
                console.log('RSVP SUCCESS [rsvp done] ' + rsvps[0].last + ', ' + rsvps[0].first);
                $('#find-name').hide();
                $('#edit-rsvp').hide();
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