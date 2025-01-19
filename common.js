class IPv4Address {
    #ipRaw;

    constructor(ip) {
        if (typeof ip === 'string') {
            this.#ipRaw = ipToInt(ip);
        } else if (typeof ip === 'number') {
            this.#ipRaw = ip;
        } else {
            throw new Error('Invalid IP address');
        }
    }

    get ip() {
        return intToIp(this.#ipRaw);
    }

    get ipRaw() {
        return this.#ipRaw;
    }

    toHostAddress(hostNumber) {
        return new IPv4Address(this.#ipRaw + hostNumber);
    }

    static fromInt(ipInt) {
        return new IPv4Address(ipInt);
    }

    static fromString(ipString) {
        if (typeof ipString !== 'string') {
            throw new Error('Invalid IP string');
        }

        return new IPv4Address(ipToInt(ipString));
    }

    static fromBaseNetwork(baseNetwork, hostNumber) {
        return new IPv4Address(baseNetwork.ipRaw + hostNumber);
    }
}

class IPv6Address {
    #ipString;

    constructor(ip) {
        this.#ipString = ip;
    }

    get ip() {
        return this.#ipString;
    }

    static fromString(ipString) {
        if (typeof ipString !== 'string') {
            throw new Error('Invalid IP string');
        }

        return new IPv6Address(ipString);
    }

    static fromBaseNetwork(baseNetwork, hostNumber) {
        return new IPv6Address(baseIpv6ToNetwork(baseNetwork.ip, hostNumber));
    }
}

class Router {
    #interfaces = [];
}

class IPHost {
    #name;
    #ipv4Address;
    #ipv6Address;

    constructor(name, ipv4Address, ipv6Address) {
        if (typeof name !== 'string') {
            throw new Error('Invalid name');
        }

        if (!(ipv4Address instanceof IPv4Address)) {
            throw new Error('Invalid IPv4 address');
        }

        if (!(ipv6Address instanceof IPv6Address)) {
            throw new Error('Invalid IPv6 address');
        }

        this.#name = name;
        this.#ipv4Address = ipv4Address;
        this.#ipv6Address = ipv6Address;
    }

    get name() {
        return this.#name;
    }

    get ipv4Address() {
        return this.#ipv4Address;
    }

    get ipv6Address() {
        return this.#ipv6Address;
    }
}

export function calculateSubnets(baseNetwork, inputs) {
    inputs = inputs.map((input, index) => {
        let networkName = String.fromCharCode(65 + index); // ASCII A = 65
        return {
            name: networkName,
            input: input
        }
    });

    let networkMaxAddresses = inputs.map((network) => {
        let { name, input } = network;
        if (input.startsWith('/')) {
            let networkPortion = parseInt(input.split('/')[1], 10);
            let hostPortion = 32 - networkPortion;
            let maxAddresses = 2 ** hostPortion;
            return {
                name,
                originalInput: input,
                maxAddresses: maxAddresses
            };
        }
        else {
            return {
                name,
                originalInput: input,
                maxAddresses: parseInt(input, 10)
            };
        }
    });

    networkMaxAddresses.sort((a, b) => b.maxAddresses - a.maxAddresses);

    let previousIp;
    let previousIncrement;

    let variableSubnets = networkMaxAddresses.map((network) => {
        let { name, originalInput, maxAddresses } = network;
        let hostBits = getRequiredHostBits(maxAddresses);
        let networkPrefix = 32 - hostBits;

        let networkValue;

        if (previousIp === undefined) {
            networkValue = ipToInt(baseNetwork);
        }
        else {
            networkValue = previousIp + previousIncrement;
        }

        previousIp = networkValue;
        previousIncrement = 2 ** hostBits;

        return {
            name,
            originalInput,
            network: intToIp(networkValue),
            networkPrefix: networkPrefix
        };
    });

    return variableSubnets;
}

function getRequiredHostBits(hosts) {
    let hostBits = 0;
    while (2 ** hostBits < hosts) {
        hostBits++;
    }
    return hostBits;
}

export function ipToInt(ip) {
    let ipParts = ip.split('.');
    return ipParts.reduce((acc, part, index) => {
        return acc + parseInt(part, 10) * (256 ** (3 - index));
    }, 0);
}

export function intToIp(int) {
    let ipParts = [];
    for (let i = 3; i >= 0; i--) {
        let part = Math.floor(int / (256 ** i));
        int -= part * (256 ** i);
        ipParts.push(part);
    }
    return ipParts.join('.');
}

export function prefixToMask(prefix) {
    let subnetMaskArr = new Array(4).fill(0);

    let prefixCopy = prefix;
    for (let i = 0; i < subnetMaskArr.length; i++) {
        let bits = Math.min(prefixCopy, 8);
        subnetMaskArr[i] = 256 - (2 ** (8 - bits));
        prefixCopy -= bits;
    }

    return subnetMaskArr.join('.');
}

export function baseIpv6ToNetwork(baseIpv6, address) {
    let segments = baseIpv6.split(':');
    let newSegment = address.toString(16);
    segments.splice(3, 0, newSegment);

    return segments.join(':');
}

export function fromIpv4Base(ipv4base, host) {
    return intToIp(ipToInt(ipv4base) + host);
}

export function fromIpv6Base(networkIpv6, host) {
    return networkIpv6 + host.toString(16);
}

export function dedent(str) {
    const smallestIndent = Math.min(...str
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.match(/^\s*/)[0].length)
    );
    return str
        .split('\n')
        .map(line => line.slice(smallestIndent))
        .join('\n');
}