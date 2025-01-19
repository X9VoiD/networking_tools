import { dedent, calculateSubnets, fromIpv4Base, fromIpv6Base, baseIpv6ToNetwork, prefixToMask } from './common.js';

document.addEventListener('DOMContentLoaded', () => {
    let goBtn = document.getElementById('go-btn');
    goBtn.addEventListener('click', calculate);
});

export function calculate() {
    // get all inputs

    let output = "";

    const configDiv = document.getElementById('configuration');
    const config = {
        ipv4: configDiv.querySelector('input.ipv4').value,
        ipv6: configDiv.querySelector('input.ipv6').value,
        consolePassword: configDiv.querySelector('input.console-password').value,
        vlanIp: configDiv.querySelector('input.vlan-ip-address').value,
        sshUser: configDiv.querySelector('input.ssh-username').value,
        sshPassword: configDiv.querySelector('input.ssh-password').value,
        sshDomainName: configDiv.querySelector('input.ssh-domain-name').value,
        motd: configDiv.querySelector('input.banner-motd').value,
    }

    const networks = [
        {
            name: "A",
            ipv4: document.querySelector('#network-a > input.ipv4').value,
            ipv6: document.querySelector('#network-a > input.ipv6').value,
        },
        {
            name: "B",
            ipv4: document.querySelector('#network-b > input.ipv4').value,
            ipv6: document.querySelector('#network-b > input.ipv6').value,
        },
        {
            name: "C",
            ipv4: document.querySelector('#network-c > input.ipv4').value,
            ipv6: document.querySelector('#network-c > input.ipv6').value,
        },
        {
            name: "D",
            ipv4: document.querySelector('#network-d > input.ipv4').value,
            ipv6: document.querySelector('#network-d > input.ipv6').value,
            link_local: document.querySelector('#network-d > input.link-local').value,
        },
        {
            name: "E",
            ipv4: document.querySelector('#network-e > input.ipv4').value,
            ipv6: document.querySelector('#network-e > input.ipv6').value,
            link_local: document.querySelector('#network-e > input.link-local').value,
        },
    ];

    const r1 = {
        up: parseInt(document.querySelector('#r1-up > input').value, 10),
        right: parseInt(document.querySelector('#r1-right > input').value, 10),
        ethernet: parseInt(document.querySelector('#r1-ethernet > input').value, 10),
    }

    const r2 = {
        left: parseInt(document.querySelector('#r2-left > input').value, 10),
        right: parseInt(document.querySelector('#r2-right > input').value, 10),
    }

    const r3 = {
        left: parseInt(document.querySelector('#r3-left > input').value, 10),
        up: parseInt(document.querySelector('#r3-up > input').value, 10),
        ethernet: parseInt(document.querySelector('#r3-ethernet > input').value, 10),
    }

    let pc = [
        parseInt(document.querySelector('#pc0 > input').value, 10),
        parseInt(document.querySelector('#pc1 > input').value, 10),
        parseInt(document.querySelector('#pc2 > input').value, 10),
        parseInt(document.querySelector('#pc3 > input').value, 10),
        parseInt(document.querySelector('#pc4 > input').value, 10),
        parseInt(document.querySelector('#pc5 > input').value, 10),
        parseInt(document.querySelector('#pc6 > input').value, 10),
        parseInt(document.querySelector('#pc7 > input').value, 10),
    ]

    // generate wiring guide
    output += "Wiring Guide (DCE/DTE does NOT matter):\n\n";
    output += "Serial: R1 s/0/0/0 -> R2 s/0/0/0\n";
    output += "Serial: R1 s/0/0/1 -> R3 s/0/0/1\n";
    output += "Serial: R2 s/0/0/1 -> R3 s/0/0/0\n";
    output += "R1 g0/0 -> S1\n";
    output += "R3 g0/0 -> S2\n";

    // calculate subnetting
    output += "\nSubnetting:\n\n";
    const variableSubnets = calculateSubnets(config.ipv4, networks.map((network) => network.ipv4))
        .map((subnet) => {
            return {
                ...subnet,
                subnetMask: prefixToMask(subnet.networkPrefix),
                ipv6: baseIpv6ToNetwork(config.ipv6, parseInt(networks.find((network) => network.name === subnet.name).ipv6, 10))
        }});

    for (let subnet of variableSubnets) {
        let { name, originalInput, network, networkPrefix, subnetMask, ipv6 } = subnet;

        output += `${name} (${originalInput}):  ${network}/${networkPrefix} ${subnetMask}\n`;

        let firstHost = fromIpv4Base(network, 1);
        let lastHost = fromIpv4Base(network, (2 ** (32 - networkPrefix)) - 2);

        output += `first: ${firstHost}\n`;
        output += `last: ${lastHost}\n`;
        output += `ipv6: ${ipv6}/64\n\n`;
    }

    const networkA = variableSubnets.find((subnet) => subnet.name === "A");
    const networkB = variableSubnets.find((subnet) => subnet.name === "B");
    const networkC = variableSubnets.find((subnet) => subnet.name === "C");
    const networkD = variableSubnets.find((subnet) => subnet.name === "D");
    const networkE = variableSubnets.find((subnet) => subnet.name === "E");

    let calculatePcIp = (network, pcNumber, gateway) => {
        let ret =
`PC${pcNumber}:
- ipv4: ${fromIpv4Base(network.network, pc[pcNumber])} ${prefixToMask(network.networkPrefix)}
- ipv4 gateway: ${fromIpv4Base(network.network, gateway)}
- ipv6: ${fromIpv6Base(network.ipv6, pc[pcNumber])}
- ipv6 gateway: ${fromIpv6Base(network.ipv6, gateway)}
`;

        return ret;
    }

    // calculate host IP addresses
    output += "\nHost IP Addresses:\n\n";
    output += calculatePcIp(networkD, 0, r1.ethernet);
    output += calculatePcIp(networkD, 1, r1.ethernet);
    output += calculatePcIp(networkD, 2, r1.ethernet);
    output += calculatePcIp(networkD, 3, r1.ethernet);
    output += calculatePcIp(networkE, 4, r3.ethernet);
    output += calculatePcIp(networkE, 5, r3.ethernet);
    output += calculatePcIp(networkE, 6, r3.ethernet);
    output += calculatePcIp(networkE, 7, r3.ethernet);

    // generate CLI configuration

    // config = [{
    //   network,
    //   network6,
    //   subnetMask
    //   ipv4hostNumber,
    //   ipv6hostNumber,
    //   interface,
    // }]
    let generateRouterConfig = (routerName, configuration) => {
        let ret =
`${routerName}:

en
conf t
hostname ${routerName}
ipv6 unicast-routing
`;

        for (let config of configuration) {
            ret +=
`int ${config.interface}
ip address ${fromIpv4Base(config.network, config.ipv4hostNumber)} ${config.subnetMask}
ipv6 address ${fromIpv6Base(config.network6, config.ipv6hostNumber)}/64
no shut
`;
        }

        ret +=
`exit

line con 0
password ${config.consolePassword}
login
line vty 0 15
password ${config.consolePassword}
login
line aux 0
password ${config.consolePassword}
login
enable secret ${config.consolePassword}
service password-encryption
banner motd #${config.motd}#`

        return ret;
    };

    // config = [{
    //   network,
    //   network6,
    //   subnetMask
    //   ipv4hostNumber,
    //   ipv6hostNumber,
    //   isSSH
    // }]
    let generateSwitchConfig = (switchName, switchConfig) => {
        let ret =
            `${switchName}:

en
conf t
hostname ${switchName}
int vlan1
ip address ${fromIpv4Base(switchConfig.network, switchConfig.ipv4hostNumber)} ${switchConfig.subnetMask}
ipv6 address ${fromIpv6Base(switchConfig.network6, switchConfig.ipv6hostNumber)}/64
no shut
exit
ip default-gateway ${fromIpv4Base(switchConfig.network, switchConfig.ipv4gateway)}

line con 0
password ${config.consolePassword}
login
line vty 0 15
password ${config.consolePassword}
login
enable secret ${config.consolePassword}
service password-encryption
banner motd #${config.motd}#`;

        if (switchConfig.isSSH) {
            ret +=
`ip ssh ver 2
ip domain-name ${config.sshDomainName}
crypto key gen rsa
1024
username ${config.sshUser} password ${config.sshPassword}
line vty 0 15
transport input ssh
login local`;
        }

        return ret;
    }

    output += "\nCLI Configuration:\n\n";
    output += generateRouterConfig("R1", [
        {
            network: networkD.network,
            network6: networkD.ipv6,
            subnetMask: networkD.subnetMask,
            ipv4hostNumber: r1.ethernet,
            ipv6hostNumber: r1.ethernet,
            interface: "g0/0"
        },
        {
            network: networkA.network,
            network6: networkA.ipv6,
            subnetMask: networkA.subnetMask,
            ipv4hostNumber: r1.up,
            ipv6hostNumber: r1.up,
            interface: "s0/0/0"
        },
        {
            network: networkC.network,
            network6: networkC.ipv6,
            subnetMask: networkC.subnetMask,
            ipv4hostNumber: r1.right,
            ipv6hostNumber: r1.right,
            interface: "s0/0/1"
        }
    ]);
    output += "\n\n";
    output += generateRouterConfig("R2", [
        {
            network: networkA.network,
            network6: networkA.ipv6,
            subnetMask: networkA.subnetMask,
            ipv4hostNumber: r2.left,
            ipv6hostNumber: r2.left,
            interface: "s0/0/0"
        },
        {
            network: networkB.network,
            network6: networkB.ipv6,
            subnetMask: networkB.subnetMask,
            ipv4hostNumber: r2.right,
            ipv6hostNumber: r2.right,
            interface: "s0/0/1"
        }
    ]);
    output += "\n\n";
    output += generateRouterConfig("R3", [
        {
            network: networkE.network,
            network6: networkE.ipv6,
            subnetMask: networkE.subnetMask,
            ipv4hostNumber: r3.ethernet,
            ipv6hostNumber: r3.ethernet,
            interface: "g0/0"
        },
        {
            network: networkC.network,
            network6: networkC.ipv6,
            subnetMask: networkC.subnetMask,
            ipv4hostNumber: r3.left,
            ipv6hostNumber: r3.left,
            interface: "s0/0/0"
        },
        {
            network: networkB.network,
            network6: networkB.ipv6,
            subnetMask: networkB.subnetMask,
            ipv4hostNumber: r3.up,
            ipv6hostNumber: r3.up,
            interface: "s0/0/1"
        }
    ]);
    output += "\n\n";
    output += generateSwitchConfig("S1", {
        network: networkA.network,
        network6: networkA.ipv6,
        subnetMask: networkA.subnetMask,
        ipv4hostNumber: config.vlanIp,
        ipv6hostNumber: config.vlanIp,
        ipv4gateway: r1.ethernet,
        isSSH: document.querySelector('#s1 input').value === "SSH"
    });
    output += "\n\n";
    output += generateSwitchConfig("S2", {
        network: networkE.network,
        network6: networkE.ipv6,
        subnetMask: networkE.subnetMask,
        ipv4hostNumber: config.vlanIp,
        ipv6hostNumber: config.vlanIp,
        ipv4gateway: r3.ethernet,
        isSSH: document.querySelector('#s2 input').value === "SSH"
    });

    output +=
`Static Routing:

R1:

ip route ${networkB.network} ${networkB.subnetMask} ${fromIpv4Base(networkA.network, r2.left)}
ipv6 route ${networkB.ipv6}/64 ${fromIpv6Base(networkA.ipv6, r2.left)}
ip route ${networkE.network} ${networkE.subnetMask} ${fromIpv4Base(networkC.network, r3.left)}
ipv6 route ${networkE.ipv6}/64 ${fromIpv6Base(networkC.ipv6, r3.left)}

R2:

ip route ${networkC.network} ${networkC.subnetMask} ${fromIpv4Base(networkA.network, r1.up)}
ipv6 route ${networkC.ipv6}/64 ${fromIpv6Base(networkA.ipv6, r1.up)}
ip route ${networkE.network} ${networkE.subnetMask} ${fromIpv4Base(networkB.network, r3.up)}
ipv6 route ${networkE.ipv6}/64 ${fromIpv6Base(networkB.ipv6, r3.up)}
ip route ${networkD.network} ${networkD.subnetMask} ${fromIpv4Base(networkA.network, r1.up)}
ipv6 route ${networkD.ipv6}/64 ${fromIpv6Base(networkA.ipv6, r1.up)}

R3:

ip route ${networkA.network} ${networkA.subnetMask} ${fromIpv4Base(networkB.network, r2.right)}
ipv6 route ${networkA.ipv6}/64 ${fromIpv6Base(networkB.ipv6, r2.right)}
ip route ${networkD.network} ${networkD.subnetMask} ${fromIpv4Base(networkC.network, r1.right)}
ipv6 route ${networkD.ipv6}/64 ${fromIpv6Base(networkC.ipv6, r1.right)}

`;

    document.querySelector('#output').innerText = output;
    downloadTextFile(output, 'guide.txt');
}

function downloadTextFile(text, filename) {
    const blob = new Blob([text], { type: 'text/plain' });

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;

    a.download = filename;

    document.body.appendChild(a); // Append the anchor to document
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}