import {useCallback, useEffect, useMemo, useState} from "react";
import styled from "styled-components";
import confetti from "canvas-confetti";
import * as anchor from "@project-serum/anchor";
import {
    Commitment,
    Connection,
    PublicKey,
    Transaction,
    LAMPORTS_PER_SOL,
    ConfirmOptions
} from "@solana/web3.js";
import {WalletAdapterNetwork} from '@solana/wallet-adapter-base';
import {useWallet} from "@solana/wallet-adapter-react";
import {WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import {GatewayProvider} from '@civic/solana-gateway-react';
import {MintLayout,TOKEN_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID,Token} from "@solana/spl-token";
import Countdown from "react-countdown";
import {Snackbar, Paper, LinearProgress, Chip} from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import {AlertState, getAtaForMint, toDate} from './utils';
import {MintButton} from './MintButton';
import {
    awaitTransactionSignatureConfirmation,
    CANDY_MACHINE_PROGRAM,
    CandyMachineAccount,
    createAccountsForMint,
    getCandyMachineState,
    getCollectionPDA,
    mintOneToken,
    SetupState,
} from "./candy-machine";

import { getNftsForOwner } from './utils';
import {getDataByMint, insertData, getDataByStatus, getOrInsertData, getDataByOwner, updateData, getOrInsertNftData} from './DbLink';


const programId = new PublicKey('dicpXny9yaituu7bfYbKxjjigtV7v1tFGNrA4noASv1')
const idl = require('./anchor.json')
const confirmOption : ConfirmOptions = {commitment : 'finalized', preflightCommitment : 'finalized', skipPreflight : false}
let pool = new PublicKey("7Y2ZTdcHq25L4u5KrbPAKYWkFJUKSoDsBH9c5L6ySkvp");

const cluster = process.env.REACT_APP_SOLANA_NETWORK!.toString();
const decimals = process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS ? +process.env.REACT_APP_SPL_TOKEN_TO_MINT_DECIMALS!.toString() : 9;
const splTokenName = process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME ? process.env.REACT_APP_SPL_TOKEN_TO_MINT_NAME.toString() : "TOKEN";

const WalletContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: right;
`;

const WalletAmount = styled.div`
  color: black;
  width: auto;
  padding: 5px 5px 5px 16px;
  min-width: 48px;
  min-height: auto;
  border-radius: 22px;
  background-color: var(--main-text-color);
  box-shadow: 0px 3px 5px -1px rgb(0 0 0 / 20%), 0px 6px 10px 0px rgb(0 0 0 / 14%), 0px 1px 18px 0px rgb(0 0 0 / 12%);
  box-sizing: border-box;
  transition: background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms, border 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
  font-weight: 500;
  line-height: 1.75;
  text-transform: uppercase;
  border: 0;
  margin: 0;
  display: inline-flex;
  outline: 0;
  position: relative;
  align-items: center;
  user-select: none;
  vertical-align: middle;
  justify-content: flex-start;
  gap: 10px;
`;

const Wallet = styled.ul`
  flex: 0 0 auto;
  margin: 0;
  padding: 0;
`;

const ConnectButton = styled(WalletMultiButton)`
  border-radius: 18px !important;
  padding: 6px 16px;
  background-color: #4E44CE;
  margin: 0 auto;
`;

const NFT = styled(Paper)`
  min-width: 500px;
  margin: 0 auto;
  padding: 5px 20px 20px 20px;
  flex: 1 1 auto;
  background-color: var(--card-background-color) !important;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22) !important;
`;

const Card = styled(Paper)`
  display: inline-block;
  background-color: var(--countdown-background-color) !important;
  margin: 5px;
  min-width: 40px;
  padding: 24px;

  h1 {
    margin: 0px;
  }
`;

const MintButtonContainer = styled.div`
  button.MuiButton-contained:not(.MuiButton-containedPrimary).Mui-disabled {
    color: #464646;
  }

  button.MuiButton-contained:not(.MuiButton-containedPrimary):hover,
  button.MuiButton-contained:not(.MuiButton-containedPrimary):focus {
    -webkit-animation: pulse 1s;
    animation: pulse 1s;
    box-shadow: 0 0 0 2em rgba(255, 255, 255, 0);
  }

  @-webkit-keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 #ef8f6e;
    }
  }
`;

const SolExplorerLink = styled.a`
  color: var(--title-text-color);
  border-bottom: 1px solid var(--title-text-color);
  font-weight: bold;
  list-style-image: none;
  list-style-position: outside;
  list-style-type: none;
  outline: none;
  text-decoration: none;
  text-size-adjust: 100%;

  :hover {
    border-bottom: 2px solid var(--title-text-color);
  }
`;

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  margin-bottom: 20px;
  margin-right: 4%;
  margin-left: 4%;
  text-align: center;
  justify-content: center;
`;

const MintContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 20px;
`;

const DesContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 20px;
`;

const Price = styled(Chip)`
  position: absolute;
  margin: 5px;
  font-weight: bold;
  font-size: 1.2em !important;
  font-family: 'Patrick Hand', cursive !important;
`;

const Image = styled.img`
  height: 400px;
  width: auto;
  border-radius: 7px;
  box-shadow: 5px 5px 40px 5px rgba(0, 0, 0, 0.5);
`;

const BorderLinearProgress = styled(LinearProgress)`
  margin: 20px;
  height: 10px !important;
  border-radius: 30px;
  border: 2px solid white;
  box-shadow: 5px 5px 40px 5px rgba(0, 0, 0, 0.5);
  background-color: var(--main-text-color) !important;

  > div.MuiLinearProgress-barColorPrimary {
    background-color: var(--title-text-color) !important;
  }

  > div.MuiLinearProgress-bar1Determinate {
    border-radius: 30px !important;
    background-image: linear-gradient(270deg, rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0.5));
  }
`;

export interface HomeProps {
    candyMachineId?: anchor.web3.PublicKey;
    connection: anchor.web3.Connection;
    txTimeout: number;
    rpcHost: string;
    network: WalletAdapterNetwork;
}

let wallet_flag = false;
let nftData: any = {reject:[], other:[]};
const OWNER_STATUS_NORMAL = 1;
const OWNER_STATUS_DONE = 2;
const OWNER_STATUS_WAITING = 0;

const NFT_NORMAL = 0;
const NFT_MINTED = 1;

const Home = (props: HomeProps) => {
    const [balance, setBalance] = useState<number>();
    const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
    const [isActive, setIsActive] = useState(false); // true when countdown completes or whitelisted
    const [solanaExplorerLink, setSolanaExplorerLink] = useState<string>("");
    const [itemsAvailable, setItemsAvailable] = useState(0);
    const [itemsRedeemed, setItemsRedeemed] = useState(0);
    const [itemsRemaining, setItemsRemaining] = useState(0);
    const [isSoldOut, setIsSoldOut] = useState(false);
    const [payWithSplToken, setPayWithSplToken] = useState(false);
    const [price, setPrice] = useState(0);
    const [priceLabel, setPriceLabel] = useState<string>("SOL");
    const [whitelistPrice, setWhitelistPrice] = useState(0);
    const [whitelistEnabled, setWhitelistEnabled] = useState(false);
    const [isBurnToken, setIsBurnToken] = useState(false);
    const [whitelistTokenBalance, setWhitelistTokenBalance] = useState(0);
    const [isEnded, setIsEnded] = useState(false);
    const [endDate, setEndDate] = useState<Date>();
    const [isPresale, setIsPresale] = useState(false);
    const [isWLOnly, setIsWLOnly] = useState(false);

    const [mintFlag, setMintFlag] = useState(false);
    const [availableMintAmount, setAvailableMintAmount] = useState(0);

    const [alertState, setAlertState] = useState<AlertState>({
        open: false,
        message: "",
        severity: undefined,
    });

    const [needTxnSplit, setNeedTxnSplit] = useState(true);
    const [setupTxn, setSetupTxn] = useState<SetupState>();

    const wallet = useWallet();
    const [candyMachine, setCandyMachine] = useState<CandyMachineAccount>();

    const rpcUrl = props.rpcHost;
    const solFeesEstimation = 0.012; // approx of account creation fees

    const anchorWallet = useMemo(() => {
        if (
            !wallet ||
            !wallet.publicKey ||
            !wallet.signAllTransactions ||
            !wallet.signTransaction
        ) {
            return;
        }

        return {
            publicKey: wallet.publicKey,
            signAllTransactions: wallet.signAllTransactions,
            signTransaction: wallet.signTransaction,
        } as anchor.Wallet;
    }, [wallet]);

    const [program] = useMemo(()=>{
        const connection = new Connection(props.rpcHost, 'confirmed');
		const provider = new anchor.Provider(connection, wallet as any, confirmOption)
		const program = new anchor.Program(idl, programId, provider)
		return [program]
	}, [])

    const refreshCandyMachineState = useCallback(
        async (commitment: Commitment = 'confirmed') => {
            if (!anchorWallet) {
                return;
            }

            const connection = new Connection(props.rpcHost, commitment);

            if (props.candyMachineId) {
                try {
                    const cndy = await getCandyMachineState(
                        anchorWallet,
                        props.candyMachineId,
                        connection,
                    );

                    setCandyMachine(cndy);
                    setItemsAvailable(cndy.state.itemsAvailable);
                    setItemsRemaining(cndy.state.itemsRemaining);
                    setItemsRedeemed(cndy.state.itemsRedeemed);

                    var divider = 1;
                    if (decimals) {
                        divider = +('1' + new Array(decimals).join('0').slice() + '0');
                    }

                    // detect if using spl-token to mint
                    if (cndy.state.tokenMint) {
                        setPayWithSplToken(true);
                        // Customize your SPL-TOKEN Label HERE
                        // TODO: get spl-token metadata name
                        setPriceLabel(splTokenName);
                        setPrice(cndy.state.price.toNumber() / divider);
                        setWhitelistPrice(cndy.state.price.toNumber() / divider);
                    } else {
                        setPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
                        setWhitelistPrice(cndy.state.price.toNumber() / LAMPORTS_PER_SOL);
                    }


                    // fetch whitelist token balance
                    if (cndy.state.whitelistMintSettings) {
                        setWhitelistEnabled(true);
                        setIsBurnToken(cndy.state.whitelistMintSettings.mode.burnEveryTime);
                        setIsPresale(cndy.state.whitelistMintSettings.presale);
                        setIsWLOnly(!isPresale && cndy.state.whitelistMintSettings.discountPrice === null);

                        if (cndy.state.whitelistMintSettings.discountPrice !== null && cndy.state.whitelistMintSettings.discountPrice !== cndy.state.price) {
                            if (cndy.state.tokenMint) {
                                setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice?.toNumber() / divider);
                            } else {
                                setWhitelistPrice(cndy.state.whitelistMintSettings.discountPrice?.toNumber() / LAMPORTS_PER_SOL);
                            }
                        }

                        let balance = 0;
                        try {
                            const tokenBalance =
                                await props.connection.getTokenAccountBalance(
                                    (
                                        await getAtaForMint(
                                            cndy.state.whitelistMintSettings.mint,
                                            anchorWallet.publicKey,
                                        )
                                    )[0],
                                );

                            balance = tokenBalance?.value?.uiAmount || 0;
                        } catch (e) {
                            console.error(e);
                            balance = 0;
                        }
                        if (commitment !== "processed") {
                            setWhitelistTokenBalance(balance);
                        }
                        setIsActive(isPresale && !isEnded && balance > 0);

                    } else {
                        setWhitelistEnabled(false);
                    }

                    // end the mint when date is reached
                    if (cndy?.state.endSettings?.endSettingType.date) {
                        setEndDate(toDate(cndy.state.endSettings.number));
                        if (
                            cndy.state.endSettings.number.toNumber() <
                            new Date().getTime() / 1000
                        ) {
                            setIsEnded(true);
                            setIsActive(false);
                        }
                    }
                    // end the mint when amount is reached
                    if (cndy?.state.endSettings?.endSettingType.amount) {
                        let limit = Math.min(
                            cndy.state.endSettings.number.toNumber(),
                            cndy.state.itemsAvailable,
                        );
                        setItemsAvailable(limit);
                        if (cndy.state.itemsRedeemed < limit) {
                            setItemsRemaining(limit - cndy.state.itemsRedeemed);
                        } else {
                            setItemsRemaining(0);
                            cndy.state.isSoldOut = true;
                            setIsEnded(true);
                        }
                    } else {
                        setItemsRemaining(cndy.state.itemsRemaining);
                    }

                    if (cndy.state.isSoldOut) {
                        setIsActive(false);
                    }

                    const [collectionPDA] = await getCollectionPDA(props.candyMachineId);
                    const collectionPDAAccount = await connection.getAccountInfo(
                        collectionPDA,
                    );

                    const txnEstimate =
                        892 +
                        (!!collectionPDAAccount && cndy.state.retainAuthority ? 182 : 0) +
                        (cndy.state.tokenMint ? 66 : 0) +
                        (cndy.state.whitelistMintSettings ? 34 : 0) +
                        (cndy.state.whitelistMintSettings?.mode?.burnEveryTime ? 34 : 0) +
                        (cndy.state.gatekeeper ? 33 : 0) +
                        (cndy.state.gatekeeper?.expireOnUse ? 66 : 0);

                    setNeedTxnSplit(txnEstimate > 1230);
                } catch (e) {
                    if (e instanceof Error) {
                        if (
                            e.message === `Account does not exist ${props.candyMachineId}`
                        ) {
                            setAlertState({
                                open: true,
                                message: `Couldn't fetch candy machine state from candy machine with address: ${props.candyMachineId}, using rpc: ${props.rpcHost}! You probably typed the REACT_APP_CANDY_MACHINE_ID value in wrong in your .env file, or you are using the wrong RPC!`,
                                severity: 'error',
                                hideDuration: null,
                            });
                        } else if (
                            e.message.startsWith('failed to get info about account')
                        ) {
                            setAlertState({
                                open: true,
                                message: `Couldn't fetch candy machine state with rpc: ${props.rpcHost}! This probably means you have an issue with the REACT_APP_SOLANA_RPC_HOST value in your .env file, or you are not using a custom RPC!`,
                                severity: 'error',
                                hideDuration: null,
                            });
                        }
                    } else {
                        setAlertState({
                            open: true,
                            message: `${e}`,
                            severity: 'error',
                            hideDuration: null,
                        });
                    }
                    console.log(e);
                }
            } else {
                setAlertState({
                    open: true,
                    message: `Your REACT_APP_CANDY_MACHINE_ID value in the .env file doesn't look right! Make sure you enter it in as plain base-58 address!`,
                    severity: 'error',
                    hideDuration: null,
                });
            }
        },
        [anchorWallet, props.candyMachineId, props.rpcHost, isEnded, isPresale, props.connection],
    );

    const renderGoLiveDateCounter = ({days, hours, minutes, seconds}: any) => {
        return (
            <div><Card elevation={1}><h1>{days}</h1>Days</Card><Card elevation={1}><h1>{hours}</h1>
                Hours</Card><Card elevation={1}><h1>{minutes}</h1>Mins</Card><Card elevation={1}>
                <h1>{seconds}</h1>Secs</Card></div>
        );
    };

    const renderEndDateCounter = ({days, hours, minutes}: any) => {
        let label = "";
        if (days > 0) {
            label += days + " days "
        }
        if (hours > 0) {
            label += hours + " hours "
        }
        label += (minutes + 1) + " minutes left to MINT."
        return (
            <div><h3>{label}</h3></div>
        );
    };

    function displaySuccess(mintPublicKey: any, qty: number = 1): void {
        let remaining = itemsRemaining - qty;
        setItemsRemaining(remaining);
        setIsSoldOut(remaining === 0);
        if (isBurnToken && whitelistTokenBalance && whitelistTokenBalance > 0) {
            let balance = whitelistTokenBalance - qty;
            setWhitelistTokenBalance(balance);
            setIsActive(isPresale && !isEnded && balance > 0);
        }
        setSetupTxn(undefined);
        setItemsRedeemed(itemsRedeemed + qty);
        if (!payWithSplToken && balance && balance > 0) {
            setBalance(balance - ((whitelistEnabled ? whitelistPrice : price) * qty) - solFeesEstimation);
        }
        setSolanaExplorerLink(cluster === "devnet" || cluster === "testnet"
            ? ("https://solscan.io/token/" + mintPublicKey + "?cluster=" + cluster)
            : ("https://solscan.io/token/" + mintPublicKey));
        setIsMinting(false);
        throwConfetti();
    };

    function throwConfetti(): void {
        confetti({
            particleCount: 400,
            spread: 70,
            origin: {y: 0.6},
        });
    }

    const onMint = async (
        beforeTransactions: Transaction[] = [],
        afterTransactions: Transaction[] = [],
    ) => {
        try {
            if (wallet.connected && candyMachine?.program && wallet.publicKey) {
                setIsMinting(true);

                if(await getMintCount() <= 0) {
                    setAlertState({
                        open: true,
                        message: 'You cannot mint pill',
                        severity: 'warning',
                    });
                    return
                }

                let setupMint: SetupState | undefined;
                if (needTxnSplit && setupTxn === undefined) {
                    setAlertState({
                        open: true,
                        message: 'Please validate account setup transaction',
                        severity: 'info',
                    });
                    setupMint = await createAccountsForMint(
                        candyMachine,
                        wallet.publicKey,
                    );
                    let status: any = {err: true};
                    if (setupMint.transaction) {
                        status = await awaitTransactionSignatureConfirmation(
                            setupMint.transaction,
                            props.txTimeout,
                            props.connection,
                            true,
                        );
                    }
                    if (status && !status.err) {
                        setSetupTxn(setupMint);
                        setAlertState({
                            open: true,
                            message:
                                'Setup transaction succeeded! You can now validate mint transaction',
                            severity: 'info',
                        });
                    } else {
                        setAlertState({
                            open: true,
                            message: 'Mint failed! Please try again!',
                            severity: 'error',
                        });
                        return;
                    }
                }

                const setupState = setupMint ?? setupTxn;

                const transactions: Transaction[] = [];

                // if(nftData.other.length > 0) {
                //     // const data = await getDataByStatus(2);
                //     // console.log("data", data)
                //     // const mintaddr = data.data[0]?.mint;
                //     const owner_data= await getOrInsertData(wallet.publicKey.toBase58());
                //     // console.log("data", nftData.other);
                //     // console.log("owner status", owner_data)
                //     let index = 0, hindex = 0;
                //     if(owner_data.data[0]?.status == OWNER_STATUS_WAITING && nftData.other.length > 0) {
                //         transactions.push(new Transaction());
                //         transactions[hindex].add(
                //             program.instruction.setFlag(
                //                 true,
                //                 { 
                //                     accounts : {
                //                         owner : wallet.publicKey
                //                     }
                //                 }
                //             ));
                //         // console.log("transactions", transactions)
                //         for ( let keyIndex in nftData.other) {
                //             transactions[hindex].add(Token.createApproveInstruction(
                //                 TOKEN_PROGRAM_ID,
                //                 nftData.other[keyIndex].account,
                //                 new PublicKey(owner_data.data[0]?.mint),
                //                 wallet.publicKey as PublicKey,
                //                 [],
                //                 1
                //             ))
                //             if(index >= 2 || parseInt(keyIndex) >= nftData.other.length - 1) {
                //                 // transactions[hindex].recentBlockhash = (await props.connection.getRecentBlockhash('singleGossip')).blockhash;
                //                 if( parseInt(keyIndex) < nftData.other.length - 1) {
                //                     transactions.push(new Transaction());
                //                     hindex++;
                //                     transactions[hindex].add(
                //                         program.instruction.setFlag(
                //                             true,
                //                             { 
                //                                 accounts : {
                //                                     owner : wallet.publicKey
                //                                 }
                //                             }
                //                         ));
                //                 }
                //                 index = -1;
                //             }
                //             index++;
                //         }
                //     }
                // }

                // console.log("transaction", transactions);

                const mint = setupState?.mint ?? anchor.web3.Keypair.generate();
                let mintResult = await mintOneToken(
                    candyMachine,
                    wallet.publicKey,
                    mint,
                    beforeTransactions,
                    transactions,
                    setupState,
                );

                let status: any = {err: true};
                let metadataStatus = null;
                if (mintResult) {
                    status = await awaitTransactionSignatureConfirmation(
                        mintResult.mintTxId,
                        props.txTimeout,
                        props.connection,
                        true,
                    );

                    metadataStatus =
                        await candyMachine.program.provider.connection.getAccountInfo(
                            mintResult.metadataKey,
                            'processed',
                        );
                    console.log('Metadata status: ', metadataStatus);
                    // if(metadataStatus) {
                    //     await updateData(wallet.publicKey, NFT_NORMAL, NFT_MINTED);
                    // }
                }

                if (status && !status.err && metadataStatus) {
                    setAlertState({
                        open: true,
                        message: 'Congratulations! Mint succeeded!',
                        severity: 'success',
                    });

                    // update front-end amounts
                    displaySuccess(mint.publicKey);
                    refreshCandyMachineState('processed');
                    await updateData(wallet.publicKey, NFT_NORMAL, NFT_MINTED);

                } else if (status && !status.err) {
                    setAlertState({
                        open: true,
                        message:
                            'Mint likely failed! Anti-bot SOL 0.01 fee potentially charged! Check the explorer to confirm the mint failed and if so, make sure you are eligible to mint before trying again.',
                        severity: 'error',
                        hideDuration: 8000,
                    });
                    refreshCandyMachineState();
                } else {
                    setAlertState({
                        open: true,
                        message: 'Mint failed! Please try again!',
                        severity: 'error',
                    });
                    refreshCandyMachineState();
                }
            }
        } catch (error: any) {
            let message = error.msg || 'Minting failed! Please try again!';
            if (!error.msg) {
                if (!error.message) {
                    message = 'Transaction Timeout! Please try again.';
                } else if (error.message.indexOf('0x138')) {
                } else if (error.message.indexOf('0x137')) {
                    message = `SOLD OUT!`;
                } else if (error.message.indexOf('0x135')) {
                    message = `Insufficient funds to mint. Please fund your wallet.`;
                }
            } else {
                if (error.code === 311) {
                    message = `SOLD OUT!`;
                } else if (error.code === 312) {
                    message = `Minting period hasn't started yet.`;
                }
            }

            setAlertState({
                open: true,
                message,
                severity: "error",
            });
        } finally {
            setIsMinting(false);
        }
    };

    const isMinted = async (data: any) => {
        const res = await getOrInsertNftData(data.mint, wallet.publicKey);
        // console.log(res);
        if(res.data[0]?.status == NFT_MINTED) {
            return {ok: true, flag: true}
        }
        return {ok: true, flag: false}
    }

    const availableMintCount = async (data: any) => {
        let count = 0;
        // console.log("dtaa", data)
        if(data.length == 0) return 0;
        await Promise.all(data.map(async (el: any) => {
            const result = await isMinted(el);
            if(result.ok == false) {
                return
            }
            if(!result.flag){
                count++;
            }
        }))
        return count;
    }

    const getMintCount = async () => {
        const res = await availableMintCount(nftData.reject);
        if(res > 0) 
            setMintFlag(true);
        else
            setMintFlag(false);
        setAvailableMintAmount(res);
        return res;
    }

    useEffect(() => {
        (async () => {
            if (anchorWallet) {
                if(wallet_flag) {
                    return;
                }
                wallet_flag = true;
                nftData = await getNftsForOwner(wallet.publicKey);
                // console.log("nft data", nftData)
                const balance = await props.connection.getBalance(anchorWallet!.publicKey);
                await getMintCount();
                setBalance(balance / LAMPORTS_PER_SOL);
            } else {
                wallet_flag = false;
            }
        })();
    }, [anchorWallet, props.connection]);

    useEffect(() => {
        (async () => {
            if(anchorWallet) {
                await refreshCandyMachineState();
            }
        })();
    }, [
        anchorWallet,
        props.candyMachineId,
        props.connection,
        isEnded,
        isPresale,
        refreshCandyMachineState
    ]);

    return (
        <main>
            <MainContainer>
                <WalletContainer>
                    <Wallet>
                        {wallet ?
                            <WalletAmount>{(balance || 0).toLocaleString()} SOL<ConnectButton/></WalletAmount> :
                            <ConnectButton>Connect Wallet</ConnectButton>}
                    </Wallet>
                </WalletContainer>
                <br/>
                <MintContainer>
                    <DesContainer>
                    <NFT elevation={3}>
                        <h2>My NFT</h2>
                        <br/>
                        <div>
                            <Image
                            src="logo.png"
                            alt="NFT To Mint"/></div>
                        <br/>
                        {wallet && isActive && mintFlag && whitelistEnabled && (whitelistTokenBalance > 0) && isBurnToken &&
                            <h3>You own {whitelistTokenBalance} WL
                            mint {whitelistTokenBalance > 1 ? "tokens" : "token"}.</h3>}
                        {wallet && isActive && mintFlag && whitelistEnabled && (whitelistTokenBalance > 0) && !isBurnToken &&
                            <h3>You are whitelisted and allowed to mint.</h3>}
                        {wallet && isActive && mintFlag && endDate && Date.now() < endDate.getTime() &&
                            <Countdown
                            date={toDate(candyMachine?.state?.endSettings?.number)}
                            onMount={({completed}) => completed && setIsEnded(true)}
                            onComplete={() => {
                                setIsEnded(true);
                            }}
                            renderer={renderEndDateCounter}
                            />}
                        {wallet && isActive && mintFlag &&
                            <h3>TOTAL MINTED : {itemsRedeemed} / {itemsAvailable}</h3>}
                            {wallet && isActive && mintFlag &&
                            <h3>Available Amount : {availableMintAmount}</h3>}
                        {wallet && isActive && mintFlag && <BorderLinearProgress variant="determinate"
                                                                        value={100 - (itemsRemaining * 100 / itemsAvailable)}/>}
                        <br />
                        <MintButtonContainer>
                            {!isActive && !isEnded && candyMachine?.state.goLiveDate && (!isWLOnly || whitelistTokenBalance > 0) ? (
                                <Countdown
                                    date={toDate(candyMachine?.state.goLiveDate)}
                                    onMount={({completed}) => completed && setIsActive(!isEnded)}
                                    onComplete={() => {
                                        setIsActive(!isEnded);
                                    }}
                                    renderer={renderGoLiveDateCounter}
                                />) : (
                                !wallet ? (
                                    <ConnectButton>Connect Wallet</ConnectButton>
                                ) : (!isWLOnly || whitelistTokenBalance > 0) ?
                                    candyMachine?.state.gatekeeper &&
                                    wallet.publicKey &&
                                    wallet.signTransaction ? (
                                        <GatewayProvider
                                            wallet={{
                                                publicKey:
                                                    wallet.publicKey ||
                                                    new PublicKey(CANDY_MACHINE_PROGRAM),
                                                //@ts-ignore
                                                signTransaction: wallet.signTransaction,
                                            }}
                                            // // Replace with following when added
                                            // gatekeeperNetwork={candyMachine.state.gatekeeper_network}
                                            gatekeeperNetwork={
                                                candyMachine?.state?.gatekeeper?.gatekeeperNetwork
                                            } // This is the ignite (captcha) network
                                            /// Don't need this for mainnet
                                            clusterUrl={rpcUrl}
                                            cluster={cluster}
                                            options={{autoShowModal: false}}
                                        >
                                            <MintButton
                                                candyMachine={candyMachine}
                                                isMinting={isMinting}
                                                isActive={isActive && mintFlag}
                                                isEnded={isEnded}
                                                isSoldOut={isSoldOut}
                                                onMint={onMint}
                                            />
                                        </GatewayProvider>
                                    ) : (
                                        <MintButton
                                            candyMachine={candyMachine}
                                            isMinting={isMinting}
                                            isActive={isActive && mintFlag}
                                            isEnded={isEnded}
                                            isSoldOut={isSoldOut}
                                            onMint={onMint}
                                        />

                                    ) :
                                    <h1>Mint is private.</h1>
                            )}
                        </MintButtonContainer>
                        <br/>
                        {wallet && isActive && mintFlag && solanaExplorerLink &&
                            <SolExplorerLink href={solanaExplorerLink} target="_blank">View on
                            Solscan</SolExplorerLink>}
                        </NFT>
                    </DesContainer>
                </MintContainer>
            </MainContainer>
            <Snackbar
                open={alertState.open}
                autoHideDuration={6000}
                onClose={() => setAlertState({...alertState, open: false})}
            >
                <Alert
                    onClose={() => setAlertState({...alertState, open: false})}
                    severity={alertState.severity}
                >
                    {alertState.message}
                </Alert>
            </Snackbar>
        </main>
    );
};

export default Home;
