'use strict';
import ccxt, { Exchange } from 'ccxt';
import * as fs from 'fs/promises';
import { log } from 'console';
import pLimit from 'p-limit'

import cluster from 'cluster';
import { cpus } from 'os';
import process from 'process';

const numCPUs = cpus().length;
const exPool = ['exmo',
    'hitbtc3',
    'hollaex',
    'poloniex',
    'oceanex',
    'upbit']


async function go(ex:Exchange) {
    await fs.mkdir(`${ex.id}/orderbooks`, { recursive: true });
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
                fs.writeFile(`${ex.id}/orderbooks/${Date.now()}.json`, JSON.stringify(obs))
            )
    }
}


(async () => {
    const EXCHANGES = ['exmo']
    if (cluster.isPrimary) {
        console.log(`Primary ${process.pid} is running`);

        // Fork workers.
        while(exPool.length) {
            var proc = cluster.fork();
            proc.on('message', async (ex: Exchange) => {
                log(`Runnine ${ex.id} in separate thread`);
                await go(ex)
            })
            proc.send(exPool.pop()) // sending next Exchange to process
        }

        cluster.on('exit', (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died`);
        });
    } else {
        // Workers can share any TCP connection
        // In this case it is an HTTP server

        console.log(`Worker ${process.pid} started`);
        process.on('message', async (ex: string) => {
            log(`Runnine ${ex} in separate thread`);
            await go(new ccxt[ex])
        })
    }
})()
