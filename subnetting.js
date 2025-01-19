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

    for (let subnet of variableSubnets) {
        let { name, originalInput, network, networkPrefix } = subnet;
        let subnetElement = document.createElement('div');
        let subnetMask = prefixToMask(networkPrefix);

        subnetElement.innerHTML = `${name} (${originalInput}):  ${network} ${subnetMask}<br>`;

        let firstHost = intToIp(ipToInt(network) + 1);
        let lastHost = intToIp(ipToInt(network) + (2 ** (32 - networkPrefix)) - 2);

        subnetElement.innerHTML += `first: ${firstHost}<br>`;
        subnetElement.innerHTML += `last: ${lastHost}<br><br>`;
        outputElement.appendChild(subnetElement);
    }
}

calculateSubnets(baseNetwork, subnets);