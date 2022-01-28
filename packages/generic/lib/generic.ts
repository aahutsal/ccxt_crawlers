'use strict';
import pAll from 'p-all'
const { goAsync } = require('./worker')
// Workers (threads) are useful for performing CPU-intensive JavaScript operations. They do not help much with I/O-intensive work. The Node.js built-in asynchronous I/O operations are more efficient than Workers can be.

// Unlike child_process or cluster, worker_threads can share memory. They do so by transferring ArrayBuffer instances or sharing SharedArrayBuffer instances.

const exPool = ['exmo',
    'hitbtc3',
    'hollaex',
    'poloniex',
    'oceanex',
    'upbit']

Promise.all(exPool.map((name) => goAsync(name)), // {concurrency: exPool.length}
           )


