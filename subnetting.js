import { calculateSubnets, ipToInt, intToIp, prefixToMask } from './common.js';

let baseNetwork = "172.16.0.0";
let subnets = [
    "/29",
    "/26",
    "200",
    "2000",
    "900",
];

document.addEventListener('DOMContentLoaded', () => {
    let startBtn = document.getElementById('startBtn');
    startBtn.addEventListener('click', startBtnOnClick);
});

export function startBtnOnClick() {
    let baseNetwork = document.getElementById('baseNetworkInput').value;
    let subnets = document.getElementById('subnetsInput').value
        .split('\n')
        .map((subnet) => subnet.trim())
        .filter((subnet) => subnet !== '');

    let variableSubnets = calculateSubnets(baseNetwork, subnets);

    let outputElement = document.getElementById('outputText');
    outputElement.innerHTML = '';

    // Create table
    let table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Create table header
    let thead = document.createElement('thead');
    let headerRow = document.createElement('tr');
    ['Subnet Name', 'Original Input', 'Network', 'First Host', 'Last Host'].forEach(headerText => {
        let headerCell = document.createElement('th');
        headerCell.textContent = headerText;
        headerCell.style.border = '1px solid #000';
        headerCell.style.padding = '8px';
        headerRow.appendChild(headerCell);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    let tbody = document.createElement('tbody');
    for (let subnet of variableSubnets) {
        let { name, originalInput, network, networkPrefix } = subnet;
        let subnetMask = prefixToMask(networkPrefix);
        let firstHost = intToIp(ipToInt(network) + 1);
        let lastHost = intToIp(ipToInt(network) + (2 ** (32 - networkPrefix)) - 2);

        // Create table row
        let row = document.createElement('tr');
        [name, originalInput, `${network} ${subnetMask}`, firstHost, lastHost].forEach(cellText => {
            let cell = document.createElement('td');
            cell.textContent = cellText;
            cell.style.border = '1px solid #000';
            cell.style.padding = '8px';
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    }
    table.appendChild(tbody);

    outputElement.appendChild(table);
}

calculateSubnets(baseNetwork, subnets);