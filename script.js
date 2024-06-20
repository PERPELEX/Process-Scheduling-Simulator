const ganttContainer=document.querySelector('.gantt-chart');
// const timeContainer=document.querySelector('.time-chart');
const dataContainer=document.querySelector('.process-data');
const file=document.getElementById('fileUpload');
const schedulingButtons = document.querySelectorAll('input[name="scheduling"]');
const timeQuantumInput = document.getElementById('timeQuantum');

// Store the data globally so it can be accessed by the event listeners
let globalData;

file.addEventListener('change', function(){
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
            const timeQuantum = timeQuantumInput ? (Number(timeQuantumInput))>0 ? Number(timeQuantumInput) : 1 : 10;
            result = rr(data, timeQuantum);
            break;
        case 'priority':
            result = ps(data);
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
    for(let i=0; i<stepsArr.length; i++){
        let div = document.createElement('div');
        div.classList.add('process');
        let stepTime = stepsArr[i].stepTime;
        let baseWidth = 30; // Base width for the div
        let scaleFactor = 55; // Scale factor for the logarithmic function
        let multiplier = Math.log(stepTime + 1) * scaleFactor; // Use log(stepTime + 1) to avoid log(0)
        div.style.width = `${baseWidth + multiplier}px`;
        div.style.height = '50px';
        let color;
        do {
            color = `rgb(${Math.floor(Math.random()*128)},${Math.floor(Math.random()*64)},${Math.floor(Math.random()*128)})`;
        } while (usedColors.includes(color));
        usedColors.push(color);
        div.style.backgroundColor = color;
        div.innerHTML = `<p>P${stepsArr[i].processId}`;
        ganttContainer.appendChild(div);

        let timeDiv = document.createElement('div');
        timeDiv.innerHTML = `<p>${result.stepsArr[i].elapsedTime}</p>`;
        div.appendChild(timeDiv);

        let processId = stepsArr[i].processId; // Corrected line
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
    let avgWaitingTime = totalWaitingTime / stepsArr.length;
    let avgTurnaroundTime = totalTurnaroundTime / stepsArr.length;
    let avgDataDiv = document.createElement('div');
    avgDataDiv.innerHTML = `Average<br>W.Time: ${avgWaitingTime.toFixed(2)}<br> T.Time: ${avgTurnaroundTime.toFixed(2)}`;
    dataContainer.appendChild(avgDataDiv);
}

function fcfs(data){
    let stepsArr = [];
    let processInfo={};
    let elapsedTime = 0;

    // Sort the data array based on arrival time
    data.sort((a, b) => a[1] - b[1]);

    for(let i=0; i<data.length; i++){
        let processId = data[i][0];
        let arrivalTime = data[i][1];
        let burstTime = data[i][2];

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
    let waitingTime = 0;
    let turnaroundTime = 0;
    let elapsedTime = 0;

    // Sort the data array based on arrival time and then burst time
    data.sort((a, b) => a[1] - b[1] || a[2] - b[2]);

    for(let i=0; i<data.length; i++){
        let processId = data[i][0];
        let arrivalTime = data[i][1];
        let burstTime = data[i][2];

        // If the process has not arrived yet, skip to the next iteration
        if(arrivalTime > elapsedTime){
            i--;
            elapsedTime++;
            continue;
        }

        waitingTime = elapsedTime - arrivalTime;
        turnaroundTime = waitingTime + burstTime;

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
    let endTime = 0;

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
    let roundQueue = []; // Queue to hold processes that have been executed in the current round

    while (processes.length > 0 || queue.length > 0 || roundQueue.length > 0) {
        while (processes.length > 0 && processes[0].arrivalTime <= elapsedTime) {
            queue.push(processes.shift());
        }

        if (queue.length === 0 && roundQueue.length > 0) {
            queue = [...roundQueue];
            roundQueue = [];
        }

        if (queue.length === 0) {
            elapsedTime++;
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
            roundQueue.push(process); // Push the process to the round queue instead of the main queue
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

    // Sort the data array based on arrival time and then priority
    data.sort((a, b) => a[1] - b[1] || a[3] - b[3]);

    for(let i=0; i<data.length; i++){
        let processId = data[i][0];
        let arrivalTime = data[i][1];
        let burstTime = data[i][2];
        let priority = data[i][3];

        // If the process has not arrived yet, skip to the next iteration
        if(arrivalTime > elapsedTime){
            i--;
            elapsedTime++;
            continue;
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
            elapsedTime: elapsedTime,
            priority: priority
        };
    }

    console.log(stepsArr);

    return {
        stepsArr: stepsArr,
        processInfo: processInfo
    };
}