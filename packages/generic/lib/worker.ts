import ccxt, { Exchange } from 'ccxt';
import * as fs from 'fs/promises';
import { log, error } from 'console';
import pLimit from 'p-limit'
import process from 'process'

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

const root = process.env.NODE_ENV === 'production'?'/mnt/orderbooks':'./orderbooks';

log(`Would write data to this root ${root}`)

async function go(ex: Exchange) {
    await fs.mkdir(`${root}/${ex.id}/orderbooks`, { recursive: true });
    await ex.loadMarkets()
    const limit = pLimit(3);
    const runners = Object.keys(ex.markets).map(market => limit(() => ex.fetchOrderBook(market)))

    if (!ex.has.fetchOrderBooks) {
        ex.fetchOrderBooks = () => Promise.all(runners);
    }
    while (true) {
        log(`Fetching next tick ${ex.id}`)
        await ex.fetchOrderBooks()
            .then((obs) =>
                fs.writeFile(`${root}/${ex.id}/orderbooks/${Date.now()}.json`, JSON.stringify(obs))
            )
            .catch(error)
    }
}
async function goAsync(exchange: string) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
            workerData: exchange
        });
        worker.on('message', resolve);
        worker.on('error', (err:Error) => {
            error(err);
            reject(err)
        });
        worker.on('exit', (code) => {
            if (code !== 0)
                reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

if (isMainThread) {
    log(`Primary ${process.pid} is running`);
    fs.mkdir(root, { recursive: true })
    module.exports = { goAsync }
} else {
    const exName = workerData;
    log(`Runnine ${exName} in separate thread`);
    go(new ccxt[exName]).then(data => parentPort.postMessage(data))
}

