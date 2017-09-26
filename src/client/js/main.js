function RxfromIO (io, eventName) {
    return Rx.Observable.create(observer => {
        io.on (eventName, (data) => {
            observer.next(data)
        });
        return {
            dispose : io.close
        }
    });
}

filterObjects = function (anObject) {
    return function (event) {
        return event['object'] == anObject;
    }
}

deltaT = function (x1, x0, dt) {
    return (x1 - x0) / dt;
}

xyzDeltaT = function (xyz1, xyz0, dt) {
    return {
        x: deltaT(xyz1['x'], xyz0['x'], dt),
        y: deltaT(xyz1['y'], xyz0['y'], dt),
        z: deltaT(xyz1['z'], xyz0['z'], dt)
    }
}

vectorMagnitude = function (vector) {
    return Math.sqrt(Math.pow(vector['x'], 2) + Math.pow(vector['y'], 2) + Math.pow(vector['z'], 2));
}

//=================================================================

let namespace = '/dataLogger';
let socket = io.connect('http://' + document.domain + ':' + location.port + namespace);
let rawEventsRx = RxfromIO(socket, 'broadcast');
let eventsRx = rawEventsRx.map(function (e) {
    return {
        object:e['object'],
        timestamp:(new Date(e['timestamp']).getTime()),
        position: {
            x:e['x'],
            y:e['y'],
            z:e['z']
        }
    };
});

//.................................................................

let objects = ["A", "B", "C"];

let positionsRx = objects.map(x => eventsRx.filter(filterObjects(x)));

let velocitiesRx = positionsRx.map(p => p.bufferCount(2, 1).map(function ([p0, p1]) {
    let dt = p1['timestamp'] - p0['timestamp'];
    speedVector = xyzDeltaT(p1['position'], p0['position'], dt);
    return {
        object:         p1['object'],
        timestamp:      p1['timestamp'],
        position:       p1['position'],
        speed:          vectorMagnitude(speedVector),
        speedVector:    speedVector
    }
}));

let accellerationsRx = velocitiesRx.map(p => p.bufferCount(2, 1).map(function ([v0, v1]) {
    let dt = v1['timestamp'] - v0['timestamp'];
    accellerationVector = xyzDeltaT(v1['speedVector'], v0['speedVector'], dt);
    return {
        object:                 v1['object'],
        timestamp:              v1['timestamp'],
        position:               v1['position'],
        accelleration:          vectorMagnitude(accellerationVector),
        accellerationVector:    accellerationVector
    }
}));

//rawEventsRx.subscribe(function(x) { console.log("raw events", x); });
//eventsRx.subscribe(function(x) { console.log("broadcast", x); });
//positionsRx.map(p => p.subscribe(x => console.log("position " + x['object'], x)));
//velocitiesRx.map(v => v.subscribe(x => console.log("velocity " + x['object'], x['speed'], x['speedVector'])));
//velocitiesRx[0].subscribe(x => console.log("velocity " + x['object'], x['speed'], x['speedVector']))
//accellerationsRx.map(a => a.subscribe(x => console.log("accelleration " + x['object'], x['accelleration'], x['accellerationVector'])));
//accellerationsRx[0].subscribe(x => console.log("accelleration " + x['object'], x['accelleration'], x['accellerationVector']));