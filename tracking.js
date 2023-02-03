
const records = {
    pointer: [],
    typing: [],
}

var pointerRecording = {
    started: false,
    events: []
};


const bins = 100

var recIcon = document.getElementById('recording-icon')
var labelInput = document.getElementById('input-label')
var textarea = document.getElementById('textarea')

var typingRecording = {
    started: false,
    events: [],
}
var typingBins = bins


window.addEventListener("load", () => {
    document.getElementById('download-button').addEventListener('click', () => saveJSON(records))
    console.log(getBrowser())

    recIcon = document.getElementById('recording-icon')
    labelInput = document.getElementById('input-label')
    textarea = document.getElementById('textarea')

    document.addEventListener("keydown", recKeyDown, false);
    textarea.addEventListener('focus', () => { console.log('focus'); typingRecording.started = true })
    textarea.addEventListener('blur', stopTypingRecording)


    document.addEventListener("keyup", (event) => {
        if (event.isComposing || event.keyCode === 229) {
            return;
        }
        if (typingRecording) {
            const stroke = {
                time: event.timeStamp,
                key: event.key,
                event: 'up',
            }
            typingRecording.events.push(stroke)
            // console.log(stroke)
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.isComposing || event.keyCode === 229) {
            return;
        }

        if (typingRecording) {
            const stroke = {
                time: event.timeStamp,
                key: event.key,
                event: 'down',
            }
            typingRecording.events.push(stroke)
            // console.log(stroke)
        }
    });
})

window.addEventListener('pointermove', (event) => {
    if (pointerRecording.started) {
        const events = 'getCoalescedEvents' in event ? event.getCoalescedEvents() : [event];
        events.sort((a, b) => Math.sign(a.timeStamp - b.timeStamp)).map(e =>
            pointerRecording.events.push({
                x: e.clientX,
                y: e.clientY,
                time: e.timeStamp,
            })
        )
    }
})

function recKeyDown(e) {
    if (e.key == 'r' & e.ctrlKey) {
        startRecording()
    }
    if (e.key == 's' & e.ctrlKey) {
        stopRecording()
    }
}

function startRecording() { 
    recIcon.style.fill = "#B22222"
    pointerRecording.started = true
}

function stopRecording() {
    
    if (pointerRecording.events.length > 5) {
        records.pointer.push({
            label: labelInput.value,
            browser: getBrowser(),
            events: pointerRecording.events,
        })
        
        plotHistogram(records.pointer, 'plotMouse')
        plotPlot(records.pointer, 'distanceMouse')
        plotFr(records.pointer, 'plotFr')
    }

    recIcon.style.fill = "gray"
    pointerRecording.started = false
    pointerRecording.events = []

}
const plotlyLayout = {
    barmode: "overlay",
    xaxis: {
        title: 'event delay (ms)',
        autotick: false,
        ticks: 'outside',
        tick0: 0,
        dtick: 5,
        ticklen: 8,
        tickwidth: 4,
        tickcolor: '#000',
        range: [0, bins],
    },
    yaxis: {
        autotick: false,
        ticks: 'outside',
        tick0: 0,
        dtick: 0.25,
        ticklen: 8,
        tickwidth: 4,
        tickcolor: '#000',
        range: [0, 1],
    }
}

function diff(A) {
    return A.slice(1).map(function (n, i) { return n - A[i]; });
}

function dists(A) {
    return A.slice(1).map(function (n, i) { return ((n.x - A[i].x) ** 2 + (n.y - A[i].y) ** 2) ** .5; });
}

function getBrowser() {
    var ua = navigator.userAgent, tem, M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return { name: 'IE', version: (tem[1] || '') };
    }
    if (M[1] === 'Chrome') {
        tem = ua.match(/\bOPR|Edge\/(\d+)/)
        if (tem != null) { return { name: 'Opera', version: tem[1] }; }
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) { M.splice(1, 1, tem[1]); }
    return {
        name: M[0],
        version: M[1]
    };
}

function saveJSON(data) {

    if (!data) {
        console.error('No data')
        return;
    }

    const isoStr = new Date().toISOString();

    if (typeof data === "object") {
        data = JSON.stringify(data, undefined, 4)
    }

    var blob = new Blob([data], { type: 'text/json' }),
        e = document.createEvent('MouseEvents'),
        a = document.createElement('a')

    a.download = `tracking_${getBrowser().name}_${isoStr.slice(0, 16)}.json`
    a.href = window.URL.createObjectURL(blob)
    a.dataset.downloadurl = ['text/json', a.download, a.href].join(':')
    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    a.dispatchEvent(e)
}

function stopTypingRecording(event) {
    console.log('stop typing')

    records.typing.push({
        events: typingRecording.events,
        label: labelInput.value,
        browser: getBrowser(),
    })

    typingRecording.started = false
    typingRecording.events = []

    plotHistogram(records.typing, 'plotKeyboard');

}

function plotHistogram(records, id) {
    const traces = records.map(
        (el, i) => {
            return {
                x: diff(el.events.map(el => el.time)),
                type: 'histogram',
                histnorm: 'probability',
                opacity: .6,
                xbins: {
                    end: typingBins,
                    size: 1,
                    start: 0
                },
                name: `${el.label} ${i}`,
            }
        }
    )

    Plotly.newPlot(id, traces, plotlyLayout);
}

function plotPlot(records, id) {
    const traces = records.map(
        (el, i) => {
            const cumulativeSum = (sum => value => sum += value)(0);
            return {
                y: dists(el.events).map(cumulativeSum).map(x => x % 5000),
                x: el.events.slice(1).map(x => x.time - el.events[0].time),
                type: 'scatter',
                opacity: .6,
                mode: 'lines',
                name: `${el.label} ${i}`,
            }
        }
    )
    Plotly.newPlot(id, traces, 
        {
        xaxis: {
            title: 'time (ms)',
            
            ticks: 'outside',
        },
        yaxis: {
            title: 'distance covered',

            ticks: 'outside',
            tickcolor: '#000',
        }
    }
    );
}

function plotFr(records, id) {
    const traces = records.map(
        (el, i) => {
            return {
                y: diff(el.events.map(el => el.time)).map(x => Math.min(x, 20)),
                x: el.events.slice(1).map(x => x.time - el.events[0].time),
                type: 'scatter',
                opacity: .6,
                mode: 'lines',
                name: `${el.label} ${i}`,
            }
        }
    )
    Plotly.newPlot(id, traces, 
        {
        xaxis: {
            title: 'time (ms)',
            ticks: 'outside',
        },
        yaxis: {
            title: 'update delay',
            ticks: 'outside',
            tickcolor: '#000',
        }
    }
    );
}
