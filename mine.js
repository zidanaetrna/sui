import { SuiMaster } from 'suidouble';
import config from './config.js';
import Miner from './includes/Miner.js';
import FomoMiner from './includes/fomo/FomoMiner.js';

// Set the threshold to 10 billion FOMO
const THRESHOLD_FOMO = 10_000_000_000; // 10 billion FOMO
const MINER_SLEEP_TIME = 100; // Time to wait between mining cycles

const run = async()=> {
    const phrase = config.phrase;
    const chain = config.chain;

    if (!config.phrase || !config.chain) {
        throw new Error('phrase and chain parameters are required');
    }

    const suiMasterParams = {
        client: chain,
        debug: !!config.debug,
    };
    if (phrase.indexOf('suiprivkey') === 0) {
        suiMasterParams.privateKey = phrase;
    } else {
        suiMasterParams.phrase = phrase;
    }
    const suiMaster = new SuiMaster(suiMasterParams);
    await suiMaster.initialize();

    console.log('suiMaster connected as ', suiMaster.address);

    const miners = {};

    const doMine = async(minerInstance) => {
        while (true) {
            try {
                await minerInstance.mine();

                // Auto-sell logic
                const fomoBalance = await suiMaster.getTokenBalance('FOMO'); // Assuming getTokenBalance is a method for getting FOMO balance
                console.log('FOMO Balance:', fomoBalance);

                // Check if FOMO balance exceeds 10 billion
                if (fomoBalance >= THRESHOLD_FOMO) {
                    await sellFomoTokens(fomoBalance); // Sell when balance reaches threshold
                }
            } catch (e) {
                console.error(e);
                console.log('restarting the miner instance...');
            }
            await new Promise((res)=>setTimeout(res, MINER_SLEEP_TIME));
        }
    };

    const sellFomoTokens = async (balance) => {
        try {
            // Assuming a sell function is available in SuiMaster for selling FOMO tokens
            console.log(`Selling ${balance} FOMO tokens...`);
            const sellTx = await suiMaster.sellToken('FOMO', balance); // Example method to sell
            console.log('Sell transaction hash:', sellTx);
        } catch (error) {
            console.error('Failed to sell FOMO tokens:', error);
        }
    };

    if (config.do.meta) {
        const miner = new Miner({
            suiMaster,
            packageId: config.packageId,
            blockStoreId: config.blockStoreId,
            treasuryId: config.treasuryId,
        });
        miners.meta = miner;
        doMine(miners.meta);
    }

    if (config.do.fomo) {
        const fomoMiner = new FomoMiner({
            suiMaster,
            packageId: config.fomo.packageId,
            configId: config.fomo.configId,
            buses: config.fomo.buses,
        });    
        miners.fomo = fomoMiner;
        doMine(miners.fomo);
    }
};

run()
    .then(()=> {
        console.error('running');
    });
