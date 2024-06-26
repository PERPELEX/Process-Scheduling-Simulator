// data being returned
// {
//     "stepsArr": [
//         {
//             "processId": <String>, // ID of the process
//             "elapsedTime": <Number>, // Total time elapsed after this process step
//             "stepTime": <Number> // Time taken by this process step
//         },
//         ...
//     ],
//     "processInfo": {
//         <processId>: {
//             "processId": <String>, // ID of the process
//             "arrivalTime": <Number>, // Time when the process arrived
//             "burstTime": <Number>, // Total execution time required by the process
//             "remainingTime": <Number>, // Remaining execution time for the process
//             "waitingTime": <Number>, // Total time the process has been waiting in the queue
//             "turnaroundTime": <Number>, // Total time from arrival to completion of the process
//             "elapsedTime": <Number> // Total time elapsed after this process completed
//         },
//         ...
//     }
// }


const ganttContainer=document.querySelector('.gantt-chart');
// const timeContainer=document.querySelector('.time-chart');
const dataContainer=document.querySelector('.process-data');
const file=document.getElementById('fileUpload');
const schedulingButtons = document.querySelectorAll('input[name="scheduling"]');
const timeQuantumInput = document.getElementById('timeQuantum');

// Store the data globally so it can be accessed by the event listeners
let globalData;

file.addEventListener('change', function(){
    ganttContainer.innerHTML = ''; // Clear the chart container
    // timeContainer.innerHTML = ''; // Clear the chart container
    dataContainer.innerHTML = ''; // Clear the chart container
    const reader = new FileReader();
    reader.onload = function(e){
        const lines = e.target.result.split('\n');
        const data = lines.map(line => line.split(' ').map(Number));
        
        // Validate data format
        const columnCount = data[0].length;
        if (columnCount < 3 || columnCount > 4 || data.some(row => row.length !== columnCount)) {
            alert("Invalid data format. All lines should contain the same number of columns, either three or four.");
            return;
        }
        
        console.log(data);
        globalData = data; // Store the data globally
        renderGanttChart(data);
    }
    reader.readAsText(this.files[0]);
});

const title_button=document.querySelector('.title-button');
title_button.addEventListener('click',function(){
    ganttContainer.innerHTML = ''; // Clear the chart container
    // timeContainer.innerHTML = ''; // Clear the chart container
    dataContainer.innerHTML = ''; // Clear the chart container
    fetch('./default-input.txt') // Specify the correct path to your default file
        .then(response => response.text())
        .then(text => {
            const lines = text.split('\n');
            const data = lines.map(line => line.split(' ').map(Number));

            // Validate data format
            const columnCount = data[0].length;
            if (columnCount < 3 || columnCount > 4 || data.some(row => row.length !== columnCount)) {
                alert("Invalid data format. All lines should contain the same number of columns, either three or four.");
                return;
            }

            console.log(data);
            globalData = data; // Store the data globally
            renderGanttChart(data);
        })
        .catch(error => console.error('Error loading the default file:', error));
    console.log('clicked');
})


// Add event listeners to the radio buttons
schedulingButtons.forEach(button => {
    button.addEventListener('change', function() {
        ganttContainer.innerHTML = ''; // Clear the chart container
        // timeContainer.innerHTML = ''; // Clear the chart container
        dataContainer.innerHTML = ''; // Clear the chart container
        const dataCopy = JSON.parse(JSON.stringify(globalData)); // Create a deep copy of the data
        renderGanttChart(dataCopy);
    });
});

// Add an event listener to the time quantum input field
timeQuantumInput.addEventListener('input', function() {
    ganttContainer.innerHTML = ''; // Clear the chart container
    // timeContainer.innerHTML = ''; // Clear the chart container
    dataContainer.innerHTML = ''; // Clear the chart container
    const dataCopy = JSON.parse(JSON.stringify(globalData)); // Create a deep copy of the data
    renderGanttChart(dataCopy);
});


function renderGanttChart(data){
    let result;
    const selectedScheduling = document.querySelector('input[name="scheduling"]:checked').value;

    switch(selectedScheduling) {
        case 'fcfs':
            result = fcfs(data);
            break;
        case 'sjf':
            result = sjf(data);
            break;
        case 'rr':
            const timeQuantumInput = document.getElementById('timeQuantum').value;
            const timeQuantum = timeQuantumInput ? (Number(timeQuantumInput)) > 0 ? Number(timeQuantumInput) : 1 : 10;
            result = rr(data, timeQuantum);
            break;
        case 'priority':
            result = ps(data);
            break;
        case 'multi':
            const timeQuantumInput2 = document.getElementById('timeQuantum').value;
            const timeQuantum2 = timeQuantumInput2 ? (Number(timeQuantumInput2)) > 0 ? Number(timeQuantumInput2) : 1 : 10;
            result = multiLevelQueue(data, timeQuantum2);
        break;
        default:
            alert('Please select a scheduling algorithm.');
            return;
    }

    let stepsArr = result.stepsArr;
    let usedColors = [];
    let totalWaitingTime = 0;
    let totalTurnaroundTime = 0;
    let completedProcesses = new Set();

    for(let i = 0; i < stepsArr.length; i++){
        let div = document.createElement('div');
        div.classList.add('process');
        let stepTime = stepsArr[i].stepTime;
        let screenWidth = window.innerWidth;
        let baseWidth, scaleFactor;

        if(screenWidth <= 480) { // Mobile
            baseWidth = 10; // Smaller base width for mobile
            scaleFactor = 25; // Smaller scale factor for mobile
        } else { // Desktop and larger screens
            baseWidth = 30; // Original base width for desktop
            scaleFactor = 55; // Original scale factor for desktop
        }

        let multiplier = Math.log(stepTime + 1) * scaleFactor; // Use log(stepTime + 1) to avoid log(0)
        div.style.width = `${baseWidth + multiplier}px`;
        div.style.height = '50px';

        let color;
        do {
            color = `rgb(${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 64)}, ${Math.floor(Math.random() * 128)})`;
        } while (usedColors.includes(color));
        usedColors.push(color);
        div.style.backgroundColor = color;

        if (stepsArr[i].processId === 'Idle Time') {
            div.innerHTML = `<p>Idle</p>`;
        } else {
            div.innerHTML = `<p>P${stepsArr[i].processId}</p>`;
        }

        ganttContainer.appendChild(div);

        let timeDiv = document.createElement('div');
        timeDiv.innerHTML = `<p>${result.stepsArr[i].elapsedTime}</p>`;
        div.appendChild(timeDiv);

        let processId = stepsArr[i].processId;
        if (processId === 'Idle Time') {
            continue;
        }

        if (completedProcesses.has(processId)) {
            continue;
        }

        let process = result.processInfo[processId];

        // Calculate waiting time and turnaround time
        let waitingTime = process.arrivalTime + process.waitingTime;
        let turnaroundTime = waitingTime + process.burstTime;

        // Update the process info with the calculated values
        process.waitingTime = waitingTime;
        process.turnaroundTime = turnaroundTime;

        // Add to total waiting and turnaround time
        totalWaitingTime += waitingTime;
        totalTurnaroundTime += turnaroundTime;

        // Render waiting and turnaround time for each process
        let dataDiv = document.createElement('div');
        dataDiv.innerHTML = `P${processId}<br>W.Time: ${waitingTime}<br> T.Time: ${turnaroundTime}`;
        dataContainer.appendChild(dataDiv);

        completedProcesses.add(processId);
    }

    // Calculate and render average waiting and turnaround time
    let avgWaitingTime = totalWaitingTime / completedProcesses.size;
    let avgTurnaroundTime = totalTurnaroundTime / completedProcesses.size;
    let avgDataDiv = document.createElement('div');
    avgDataDiv.innerHTML = `Average<br>W.Time: ${avgWaitingTime.toFixed(2)}<br> T.Time: ${avgTurnaroundTime.toFixed(2)}`;
    dataContainer.appendChild(avgDataDiv);
}


function fcfs(data){
    let stepsArr = [];
    let processInfo = {};
    let elapsedTime = 0;

    // Sort the data array based on arrival time
    data.sort((a, b) => a[1] - b[1]);

    for(let i = 0; i < data.length; i++){
        let processId = data[i][0];
        let arrivalTime = data[i][1];
        let burstTime = data[i][2];

        // Check for idle time
        if (arrivalTime > elapsedTime) {
            let idleTime = arrivalTime - elapsedTime;
            stepsArr.push({
                processId: 'Idle Time',
                elapsedTime: arrivalTime,
                stepTime: idleTime
            });
            elapsedTime = arrivalTime;
        }

        // Waiting time is total time till now minus the arrival time of the process
        let waitingTime = Math.max(0, elapsedTime - arrivalTime);

        // Turnaround time is waiting time + burst time
        let turnaroundTime = waitingTime + burstTime;

        // Total time is incremented by the burst time of the current process
        elapsedTime += burstTime;

        stepsArr.push({
            processId: processId,
            elapsedTime: elapsedTime,
            stepTime: burstTime
        });

        processInfo[processId] = {
            processId: processId,
            arrivalTime: arrivalTime,
            burstTime: burstTime,
            waitingTime: waitingTime,
            turnaroundTime: turnaroundTime,
            elapsedTime: elapsedTime
        };
    }

    return {
        stepsArr: stepsArr,
        processInfo: processInfo
    };
}


function sjf(data) {
    let stepsArr = [];
    let processInfo = {};
    let elapsedTime = 0;

    // Sort the data array based on arrival time and then burst time
    data.sort((a, b) => a[1] - b[1] || a[2] - b[2]);

    for (let i = 0; i < data.length; i++) {
        let processId = data[i][0];
        let arrivalTime = data[i][1];
        let burstTime = data[i][2];

        // If the process has not arrived yet, we need to handle idle time
        if (arrivalTime > elapsedTime) {
            let idleTime = arrivalTime - elapsedTime;
            stepsArr.push({
                processId: 'Idle Time',
                elapsedTime: elapsedTime + idleTime,
                stepTime: idleTime
            });
            elapsedTime += idleTime;
        }

        let waitingTime = elapsedTime - arrivalTime;
        let turnaroundTime = waitingTime + burstTime;

        elapsedTime += burstTime;

        stepsArr.push({
            processId: processId,
            elapsedTime: elapsedTime,
            stepTime: burstTime
        });

        processInfo[processId] = {
            processId: processId,
            arrivalTime: arrivalTime,
            burstTime: burstTime,
            waitingTime: waitingTime,
            turnaroundTime: turnaroundTime,
            elapsedTime: elapsedTime
        };
    }

    console.log(stepsArr);

    return {
        stepsArr: stepsArr,
        processInfo: processInfo
    };
}


function rr(data, quantum) {
    let stepsArr = [];
    let processInfo = {};
    let elapsedTime = 0;

    data.sort((a, b) => a[1] - b[1]);

    let processes = data.map(item => ({
        processId: item[0],
        arrivalTime: item[1],
        burstTime: item[2],
        remainingTime: item[2],
        waitingTime: 0,
        turnaroundTime: 0,
        elapsedTime: 0
    }));

    let queue = [];
    let roundQueue = [];

    while (processes.length > 0 || queue.length > 0 || roundQueue.length > 0) {
        while (processes.length > 0 && processes[0].arrivalTime <= elapsedTime) {
            queue.push(processes.shift());
        }

        if (queue.length === 0 && roundQueue.length > 0) {
            queue = [...roundQueue];
            roundQueue = [];
        }

        if (queue.length === 0) {
            if (processes.length > 0) {
                let nextArrivalTime = processes[0].arrivalTime;
                let idleTime = nextArrivalTime - elapsedTime;
                stepsArr.push({
                    processId: 'Idle Time',
                    elapsedTime: elapsedTime + idleTime,
                    stepTime: idleTime
                });
                elapsedTime = nextArrivalTime;
            } else {
                elapsedTime++;
            }
            continue;
        }

        let process = queue.shift();
        let stepStartTime = elapsedTime;

        if (process.remainingTime <= quantum) {
            elapsedTime += process.remainingTime;
            process.turnaroundTime = elapsedTime - process.arrivalTime;
            process.elapsedTime = elapsedTime;
            process.remainingTime = 0;
            process.waitingTime = process.turnaroundTime - process.burstTime;
            processInfo[process.processId] = process;
        } else {
            elapsedTime += quantum;
            process.remainingTime -= quantum;
            roundQueue.push(process);
        }

        stepsArr.push({
            processId: process.processId,
            elapsedTime: elapsedTime,
            stepTime: elapsedTime - stepStartTime
        });
    }

    console.log(stepsArr);

    return {
        stepsArr: stepsArr,
        processInfo: processInfo
    };
}


function ps(data) {
    let stepsArr = [];
    let processInfo = {};
    let elapsedTime = 0;

    // Sort the data array based on arrival time
    data.sort((a, b) => a[1] - b[1]);

    while (data.length > 0) {
        // Filter processes that have arrived by the current elapsedTime
        let availableProcesses = data.filter(process => process[1] <= elapsedTime);

        if (availableProcesses.length === 0) {
            // If no process has arrived, increment elapsedTime and add idle time step
            let nextArrivalTime = data[0][1];
            let idleTime = nextArrivalTime - elapsedTime;

            stepsArr.push({
                processId: 'Idle Time',
                elapsedTime: elapsedTime + idleTime,
                stepTime: idleTime
            });

            elapsedTime = nextArrivalTime;
            continue;
        }

        // Sort the available processes by priority (lower number = higher priority)
        availableProcesses.sort((a, b) => a[3] - b[3]);

        // Select the process with the highest priority
        let nextProcess = availableProcesses[0];

        // Extract process details
        let [processId, arrivalTime, burstTime, priority] = nextProcess;

        // Calculate waiting and turnaround times
        let waitingTime = elapsedTime - arrivalTime;
        let turnaroundTime = waitingTime + burstTime;

        // Update elapsedTime
        elapsedTime += burstTime;

        // Add process execution step to stepsArr
        stepsArr.push({
            processId: processId,
            elapsedTime: elapsedTime,
            stepTime: burstTime
        });

        // Update processInfo
        processInfo[processId] = {
            processId: processId,
            arrivalTime: arrivalTime,
            burstTime: burstTime,
            waitingTime: waitingTime,
            turnaroundTime: turnaroundTime,
            elapsedTime: elapsedTime,
            priority: priority
        };

        // Remove the executed process from the data array
        data = data.filter(process => process[0] !== processId);
    }

    console.log(stepsArr);

    return {
        stepsArr: stepsArr,
        processInfo: processInfo
    };
}

function multiLevelQueue(data, rrQuantum) {
    let stepsArr = [];
    let processInfo = {};
    let elapsedTime = 0;

    // Separate processes into different priority levels
    let highPriorityQueue = data.filter(process => process[3] === 1);
    let mediumPriorityQueue = data.filter(process => process[3] === 2);
    let lowPriorityQueue = data.filter(process => process[3] > 2);

    // Sort queues based on arrival time
    highPriorityQueue.sort((a, b) => a[1] - b[1]);
    mediumPriorityQueue.sort((a, b) => a[1] - b[1]);
    lowPriorityQueue.sort((a, b) => a[1] - b[1]);

    function processRR(queue, quantum, initialElapsedTime) {
        let localStepsArr = [];
        let localElapsedTime = initialElapsedTime;
        let roundQueue = [];

        while (queue.length > 0 || roundQueue.length > 0) {
            while (queue.length > 0 && queue[0][1] <= localElapsedTime) {
                roundQueue.push(queue.shift());
            }

            if (roundQueue.length === 0) {
                localStepsArr.push({
                    processId: 'Idle Time',
                    elapsedTime: localElapsedTime + 1,
                    stepTime: 1
                });
                localElapsedTime++;
                continue;
            }

            let process = roundQueue.shift();
            let [processId, arrivalTime, burstTime, priority] = process;
            let remainingTime = burstTime - (processInfo[processId]?.elapsedTime || 0);

            if (remainingTime <= quantum) {
                localElapsedTime += remainingTime;
                processInfo[processId] = {
                    processId: processId,
                    arrivalTime: arrivalTime,
                    burstTime: burstTime,
                    waitingTime: localElapsedTime - arrivalTime - burstTime,
                    turnaroundTime: localElapsedTime - arrivalTime,
                    elapsedTime: localElapsedTime
                };
            } else {
                localElapsedTime += quantum;
                remainingTime -= quantum;
                roundQueue.push([processId, arrivalTime, remainingTime, priority]);
            }

            localStepsArr.push({
                processId: processId,
                elapsedTime: localElapsedTime,
                stepTime: Math.min(quantum, remainingTime)
            });
        }

        return { localStepsArr, processInfo, localElapsedTime };
    }

    function processSJF(queue, initialElapsedTime) {
        let localStepsArr = [];
        let localElapsedTime = initialElapsedTime;

        queue.sort((a, b) => a[2] - b[2]); // Sort by burst time

        while (queue.length > 0) {
            let availableProcesses = queue.filter(process => process[1] <= localElapsedTime);

            if (availableProcesses.length === 0) {
                let nextArrivalTime = queue[0][1];
                let idleTime = nextArrivalTime - localElapsedTime;

                localStepsArr.push({
                    processId: 'Idle Time',
                    elapsedTime: localElapsedTime + idleTime,
                    stepTime: idleTime
                });

                localElapsedTime = nextArrivalTime;
                continue;
            }

            let nextProcess = availableProcesses.shift();
            let [processId, arrivalTime, burstTime, priority] = nextProcess;

            let waitingTime = localElapsedTime - arrivalTime;
            let turnaroundTime = waitingTime + burstTime;

            localElapsedTime += burstTime;

            localStepsArr.push({
                processId: processId,
                elapsedTime: localElapsedTime,
                stepTime: burstTime
            });

            processInfo[processId] = {
                processId: processId,
                arrivalTime: arrivalTime,
                burstTime: burstTime,
                waitingTime: waitingTime,
                turnaroundTime: turnaroundTime,
                elapsedTime: localElapsedTime
            };

            queue = queue.filter(process => process[0] !== processId);
        }

        return { localStepsArr, processInfo, localElapsedTime };
    }

    function processFCFS(queue, initialElapsedTime) {
        let localStepsArr = [];
        let localElapsedTime = initialElapsedTime;

        queue.sort((a, b) => a[1] - b[1]); // Sort by arrival time

        while (queue.length > 0) {
            let process = queue.shift();
            let [processId, arrivalTime, burstTime, priority] = process;

            if (arrivalTime > localElapsedTime) {
                let idleTime = arrivalTime - localElapsedTime;
                localStepsArr.push({
                    processId: 'Idle Time',
                    elapsedTime: localElapsedTime + idleTime,
                    stepTime: idleTime
                });
                localElapsedTime = arrivalTime;
            }

            let waitingTime = localElapsedTime - arrivalTime;
            let turnaroundTime = waitingTime + burstTime;

            localElapsedTime += burstTime;

            localStepsArr.push({
                processId: processId,
                elapsedTime: localElapsedTime,
                stepTime: burstTime
            });

            processInfo[processId] = {
                processId: processId,
                arrivalTime: arrivalTime,
                burstTime: burstTime,
                waitingTime: waitingTime,
                turnaroundTime: turnaroundTime,
                elapsedTime: localElapsedTime
            };
        }

        return { localStepsArr, processInfo, localElapsedTime };
    }

    // Process high priority queue with Round Robin
    if (highPriorityQueue.length > 0) {
        let { localStepsArr: rrSteps, processInfo: rrInfo, localElapsedTime: rrElapsedTime } = processRR(highPriorityQueue, rrQuantum, elapsedTime);
        stepsArr = stepsArr.concat(rrSteps);
        Object.assign(processInfo, rrInfo);
        elapsedTime = rrElapsedTime;
    }

    // Process medium priority queue with SJF
    if (mediumPriorityQueue.length > 0) {
        let { localStepsArr: sjfSteps, processInfo: sjfInfo, localElapsedTime: sjfElapsedTime } = processSJF(mediumPriorityQueue, elapsedTime);
        stepsArr = stepsArr.concat(sjfSteps);
        Object.assign(processInfo, sjfInfo);
        elapsedTime = sjfElapsedTime;
    }

    // Process low priority queue with FCFS
    if (lowPriorityQueue.length > 0) {
        let { localStepsArr: fcfsSteps, processInfo: fcfsInfo, localElapsedTime: fcfsElapsedTime } = processFCFS(lowPriorityQueue, elapsedTime);
        stepsArr = stepsArr.concat(fcfsSteps);
        Object.assign(processInfo, fcfsInfo);
        elapsedTime = fcfsElapsedTime;
    }

    console.log(stepsArr);

    return {
        stepsArr: stepsArr,
        processInfo: processInfo
    };
}
