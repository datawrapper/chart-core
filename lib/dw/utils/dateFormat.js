/*
 * return a custom date tick format function for d3.time.scales
 *
 * @param daysDelta    the number of days between minimum and maximum date
 */
export default function(daysDelta) {
    /* global Globalize */
    let newMonth = true;
    let lastDate = false;
    function timeFormat(formats) {
        return function(date) {
            newMonth = !lastDate || date.getMonth() !== lastDate.getMonth();
            lastDate = date;
            let i = formats.length - 1;
            let f = formats[i];
            while (!f[1](date)) f = formats[--i];
            return f[0](date);
        };
    }

    function timeFmt(fmt) {
        var format = function(date) {
            var r = Globalize.format(date, fmt);
            return fmt !== 'htt' ? r : r.toLowerCase();
        };
        return format;
    }

    var fmt = (function(lang) {
        return {
            date: lang === 'de' ? 'dd.' : 'dd',
            hour: lang !== 'en' ? 'H:00' : 'htt',
            minute: lang === 'de' ? 'H:mm' : 'h:mm',
            mm: lang === 'de' ? 'd.M.' : 'MM/dd',
            mmm: lang === 'de' ? 'd.MMM' : 'MMM dd',
            mmmm: lang === 'de' ? 'd. MMMM' : 'MMMM dd'
        };
    })(Globalize.culture().language);

    // use globalize instead of d3
    return timeFormat([
        [
            timeFmt('yyyy'),
            function() {
                return true;
            }
        ],
        [
            timeFmt(daysDelta > 70 ? 'MMM' : 'MMM'),
            function(d) {
                return d.getMonth() !== 0;
            }
        ], // not January
        [
            timeFmt(fmt.date),
            function(d) {
                return d.getDate() !== 1;
            }
        ], // not 1st of month
        [
            timeFmt(daysDelta < 7 ? fmt.mm : daysDelta > 70 ? fmt.mmm : fmt.mmm),
            function(d) {
                return d.getDate() !== 1 && newMonth;
            }
        ], // not 1st of month
        // [timeFmt("%a %d"), function(d) { return d.getDay() && d.getDate() != 1; }],  // not monday
        [
            timeFmt(fmt.hour),
            function(d) {
                return d.getHours();
            }
        ],
        [
            timeFmt(fmt.minute),
            function(d) {
                return d.getMinutes();
            }
        ],
        [
            timeFmt(':ss'),
            function(d) {
                return d.getSeconds();
            }
        ],
        [
            timeFmt('.fff'),
            function(d) {
                return d.getMilliseconds();
            }
        ]
    ]);
}
