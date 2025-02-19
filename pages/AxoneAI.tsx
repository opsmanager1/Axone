"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Sun, Moon, Loader2, Copy, Check } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SigningStargateClient } from "@cosmjs/stargate";

//const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;
const GENERATION_PRICE = 1;
const AXONE_CHAIN_ID = "axone-dentrite-1"; 
const RECIPIENT_ADDRESS = "axone1mtp47d2uyu9g89tfh2ghtey7f9a4lj8f9rg9x4";
const RPC_URL = "https://api.dentrite.axone.xyz:443/rpc";
const REST_URL = "https://api.dentrite.axone.xyz";

export default function NFTClaimLanding() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  const checkNetwork = async () => {
    if (typeof window.keplr !== "undefined") {
      try {
        const chainId = await window.keplr.getChainId();
        setIsCorrectNetwork(chainId === AXONE_CHAIN_ID);
        return chainId === AXONE_CHAIN_ID;
      } catch (error) {
        console.error("Error checking network:", error);
        return false;
      }
    }
    return false;
  };

  const handleConnectWallet = async () => {
    if (window.keplr && window.getOfflineSigner) {
      try {
        await window.keplr.experimentalSuggestChain({
          chainId: AXONE_CHAIN_ID,
          chainName: "Axone testnet",
          rpc: RPC_URL,
          rest: REST_URL,
          bip44: {
            coinType: 118,
          },
          bech32Config: {
            bech32PrefixAccAddr: "axone",
            bech32PrefixAccPub: "axonepub",
            bech32PrefixValAddr: "axonevaloper",
            bech32PrefixValPub: "axonevaloperpub",
            bech32PrefixConsAddr: "axonevalcons",
            bech32PrefixConsPub: "axonevalconspub",
          },
          currencies: [
            {
              coinDenom: "AXONE",
              coinMinimalDenom: "uaxone",
              coinDecimals: 6,
              coinGeckoId: "unknown",
            },
          ],
          feeCurrencies: [
            {
              coinDenom: "AXONE",
              coinMinimalDenom: "uaxone",
              coinDecimals: 6,
              coinGeckoId: "unknown",
              gasPriceStep: {
                low: 0.01,
                average: 0.025,
                high: 0.03,
              },
            },
          ],
          stakeCurrency: {
            coinDenom: "AXONE",
            coinMinimalDenom: "uaxone",
            coinDecimals: 6,
            coinGeckoId: "unknown",
          },
          features: [],
          beta: true,
        });

        await window.keplr.enable(AXONE_CHAIN_ID);
        const offlineSigner = window.getOfflineSigner(AXONE_CHAIN_ID);
        const accounts = await offlineSigner.getAccounts();
        if (accounts.length > 0) {
          setWalletAddress(accounts[0].address);
          setIsWalletConnected(true);
          setIsCorrectNetwork(true);
        } else {
          alert("No accounts found in Keplr.");
        }
      } catch (error) {
        console.error("Failed to connect Keplr:", error);
        alert("Failed to connect to Keplr. Please try again.");
      }
    } else {
      alert("Keplr not found. Please install Keplr extension.");
    }
  };

  const handleLogout = () => {
    setIsWalletConnected(false);
    setWalletAddress("");
    setIsCorrectNetwork(false);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleGenerateImage = async () => {
    if (!prompt) return;
    setIsGenerating(true);

    try {
        if (!window.keplr) {
            alert("❌ Keplr wallet not found!");
            setIsGenerating(false);
            return;
        }

        await window.keplr.enable(AXONE_CHAIN_ID);
        const offlineSigner = window.getOfflineSigner(AXONE_CHAIN_ID);
        const accounts = await offlineSigner.getAccounts();

        if (accounts.length === 0) {
            alert("❌ Wallet not connected!");
            setIsGenerating(false);
            return;
        }

        const senderAddress = accounts[0].address;
        console.log(`💳 Sender: ${senderAddress}`);

        const client = await SigningStargateClient.connectWithSigner(RPC_URL, offlineSigner);

        const amount = [{ denom: "uaxone", amount: (GENERATION_PRICE * 10 ** 6).toString() }];
        const fee = {
            amount: [{ denom: "uaxone", amount: "5000" }],
            gas: "200000",
        };

        const result = await client.sendTokens(senderAddress, RECIPIENT_ADDRESS, amount, fee, "");
        console.log("✅ Transaction result:", result);

        if (result.code !== undefined && result.code !== 0) {
            console.error(`Failed to send tx: ${result.rawLog}`); // Выводим лог ошибки
            throw new Error(`Failed to send tx: ${result.rawLog}`);
        }

        alert("✅ Transaction sent successfully!");

        await waitForTransaction(result.transactionHash);
        console.log("🖼️ Generating image...");
        await generateImage(prompt);

    } catch (error) {
        console.error("❌ Transaction error:", error);
        alert("❌ Transaction failed! Check console for details.");
    } finally {
        setIsGenerating(false);
    }
};


 const waitForTransaction = async (txHash: string) => {
    while (true) {
        const response = await fetch(`${REST_URL}/cosmos/tx/v1beta1/txs/${txHash}`);
        const data = await response.json();

        if (data.tx_response && data.tx_response.code === 0) {
            console.log(`✅ Transaction confirmed! TX: ${txHash}`);
            alert(`✅ Transaction confirmed!\nTX Hash: ${txHash}`);
            console.log("Генерация изображения с prompt:", prompt); // Добавьте лог
            await generateImage(prompt); // Убедитесь, что prompt передается
            return;
        } else if (data.tx_response && data.tx_response.code) {
            console.log(`❌ Transaction failed! TX: ${txHash}`);
            alert(`❌ Transaction failed!\nTX Hash: ${txHash}`);
            return;
        }

        await new Promise((resolve) => setTimeout(resolve, 3000)); 
    }
};




  const generateImage = async (prompt: string) => {
    console.log("Начало генерации изображения с prompt:", prompt); // Добавьте лог
    setIsGenerating(true);
    let attempts = 3; 
    const API_URL = "/api/generateImage"; 

    while (attempts > 0) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); 
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorJson = await response.json().catch(() => null);
                const errorMessage = errorJson?.error || `Ошибка ${response.status}: ${response.statusText}`;
                console.error("❌ Ошибка API:", errorMessage); // Обновлено
                if (response.status === 503 && attempts > 1) {
                    console.warn("⏳ Сервер перегружен, повторная попытка...");
                    await new Promise((res) => setTimeout(res, 5000)); 
                    attempts--;
                    continue;
                }
                throw new Error(errorMessage);
            }

            const { imageUrl } = await response.json();
            setGeneratedImage(imageUrl);
            console.log("✅ Изображение успешно сгенерировано!", imageUrl); // Добавьте лог
            break;
        } catch (error) {
            console.error("❌ Ошибка во время генерации:", error);
            if (error.name === "AbortError") {
                console.error("⏳ Время запроса истекло.");
            }
            attempts--;

            if (attempts === 0) {
                alert("Ошибка генерации изображения: " + (error.message || "Неизвестная ошибка"));
            }
        } finally {
            setIsGenerating(false);
        }
    }
};




  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  useEffect(() => {
    if (isWalletConnected) {
      checkNetwork();
    }
  }, [isWalletConnected]);

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? "bg-black" : "bg-white"}`}>
      <nav
        className={`flex justify-between items-center p-4 ${
  isDarkMode ? "bg-[#003366]" : "bg-[#f8f9fa]"
} text-black sticky top-0 z-10 rounded-b-lg shadow-md`}
      >
        <div className="flex items-center space-x-2">
          <Avatar>
            <AvatarImage
              src="https://pbs.twimg.com/profile_images/1890424736359882753/NmjlHv3T_400x400.jpg"
              alt="Axone"
            />
            <AvatarFallback>WD</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold tracking-tight italic">Axone AI tool</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Sun className="h-4 w-4" />
          <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
          <Moon className="h-4 w-4" />
          {!isWalletConnected ? (
            <Button
              onClick={handleConnectWallet}
              variant="outline"
              className="bg-white hover:bg-gray-100 text-black transition-colors"
            >
              Connect Wallet
            </Button>
          ) : (
            <div className="flex items-center space-x-2">
              {isCorrectNetwork ? (
                <>
                  <span className="text-sm text-gray-700">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className="p-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                    title="Copy address"
                  >
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </>
              ) : (
                <span className="text-sm text-red-500">Wrong Network</span>
              )}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </nav>

      <section className={`container mx-auto px-4 py-16 ${isDarkMode ? "text-white" : "text-black"}`}>
        <h2 className="text-3xl font-semibold mb-8 text-center">Generate Your AI Art</h2>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="mb-6 text-center">
            <p className="mb-2">Create unique AI-generated art with our advanced image generation model.</p>
            <p className="font-semibold">Price per generation: {GENERATION_PRICE} $AXONE</p>
          </div>
          <div className="flex space-x-4">
            <Input
              type="text"
              placeholder="Enter your prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className={`${isDarkMode ? "bg-gray-800 text-white" : "bg-white text-black"} border-gray-600`}
            />
            <Button
  onClick={handleGenerateImage}
  disabled={isGenerating || !prompt || !isWalletConnected || !isCorrectNetwork}
  variant={isDarkMode ? "outline" : "default"}
  className={`border ${
    isDarkMode
      ? "bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
      : "bg-gray-100 hover:bg-gray-200 text-black border-gray-300"
  } transition-colors`}
>
  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate"}
</Button>
          </div>
          {!isCorrectNetwork && isWalletConnected && (
            <p className="text-red-500 text-center">
              Please switch to the Axone network to use this dApp.
              <Button
                onClick={async () => {
                  console.log("Switch Network button clicked");
                  const switched = await switchNetwork();
                  if (switched) {
                    console.log("Network switched successfully");
                    setIsCorrectNetwork(true);
                  } else {
                    console.log("Failed to switch network");
                  }
                }}
                variant="link"
                className="text-blue-500 hover:text-blue-600 ml-2"
              >
                Switch Network
              </Button>
            </p>
          )}
          {generatedImage && (
            <Image
              src={generatedImage || "/placeholder.svg"}
              width={512}
              height={512}
              alt="Generated AI Art"
              className="rounded-lg shadow-xl mx-auto"
            />
          )}
        </div>
      </section>

      <footer className={`p-6 ${isDarkMode ? "bg-black text-white" : "bg-gray-100 text-black"} mt-auto`}>
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <p className="text-sm font-semibold">© 2025 BITNODES. All Rights Reserved.</p>
          </div>
          <div className="flex space-x-6">
            <a
              href="https://x.com/0psmanager"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg hover:text-blue-500 transition-colors"
            >
              Twitter
            </a>
            <a
              href="https://github.com/opsmanager1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg hover:text-gray-700 transition-colors"
            >
              GitHub
            </a>
            <a href="mailto:opsmanager133@gmail.com" className="text-lg hover:text-green-500 transition-colors">
              Contact
            </a>
          </div>
        </div>
        <div className="mt-4 text-center text-xs">
          <p className="text-gray-500">Powered by AXONE protocol chain AI Generator. Designed with ❤️ by the BITNODES Team.</p>
        </div>
      </footer>
    </div>
  );
}
