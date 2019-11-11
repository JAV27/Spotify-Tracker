$(document).ready(function() {

    let activeType = "1";
    let activeTime = "1";

    $('.type .list-group-horizontal-md a').on('click', function (e) {
        e.preventDefault();
        activeType = $(this).attr('id');
        showTap(activeType, activeTime);
    });

    $('.time .list-group-horizontal-md a').on('click', function (e) {
        e.preventDefault();
        activeTime = $(this).attr('id');
        showTap(activeType, activeTime);
    });

    let showTap = (type, time) => {
        $('.info .show').addClass('d-none').removeClass('show');
        $('.info #' + type + time).addClass('show').removeClass('d-none');
    }
    
});