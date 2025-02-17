"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Sun, Moon, Loader2, Copy, Check } from "lucide-react"
import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const HUGGING_FACE_API_KEY = "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"
const GENERATION_PRICE = 1
const WARDEN_CHAIN_ID = "0x271A" // 10010 в 16-ричном формате

export default function NFTClaimLanding() {
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [prompt, setPrompt] = useState("")
  const [generatedImage, setGeneratedImage] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)

  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      window.ethereum.on("chainChanged", (chainId: string) => {
        setIsCorrectNetwork(chainId === WARDEN_CHAIN_ID)
      })
    }

    return () => {
      if (typeof window.ethereum !== "undefined") {
        window.ethereum.removeListener("chainChanged", () => {})
      }
    }
  }, [])

  const checkNetwork = async () => {
    if (typeof window.ethereum !== "undefined") {
      const chainId = await window.ethereum.request({ method: "eth_chainId" })
      setIsCorrectNetwork(chainId === WARDEN_CHAIN_ID)
      return chainId === WARDEN_CHAIN_ID
    }
    return false
  }

  const switchNetwork = async () => {
    if (typeof window.ethereum === "undefined") {
      console.error("MetaMask is not installed")
      alert("Please install MetaMask to use this feature")
      return false
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: WARDEN_CHAIN_ID }],
      })
      console.log("Successfully switched to Warden network")
      await checkNetwork()
      return true
    } catch (error: any) {
      console.error("Error switching network:", error)
      if (error.code === 4902) {
        console.log("Warden network not found, attempting to add it")
        return addWardenNetwork()
      } else {
        alert("Failed to switch network. Please try again.")
        return false
      }
    }
  }

  const addWardenNetwork = async () => {
    const chainParams = {
      chainId: WARDEN_CHAIN_ID,
      chainName: "Warden Protocol Testnet",
      rpcUrls: ["https://evm.chiado.wardenprotocol.org"],
      nativeCurrency: {
        name: "WARD",
        symbol: "WARD",
        decimals: 18,
      },
      blockExplorerUrls: ["https://explorer.herculesnode.com/Warden-Chiado"],
    }

    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [chainParams],
      })
      console.log("Successfully added Warden network")
      return true
    } catch (error) {
      console.error("Error adding Warden network:", error)
      alert("Failed to add Warden network. Please try again or add it manually.")
      return false
    }
  }

  const handleConnectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const isCorrect = await checkNetwork()
        if (!isCorrect) {
          const switched = await switchNetwork()
          if (!switched) {
            alert("Please switch to the Warden network to use this dApp.")
            return
          }
        }
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
        setWalletAddress(accounts[0])
        setIsWalletConnected(true)
        setIsCorrectNetwork(true)
      } catch (error) {
        console.error("Failed to connect wallet:", error)
      }
    } else {
      alert("Please install MetaMask!")
    }
  }

  const handleLogout = () => {
    setIsWalletConnected(false)
    setWalletAddress("")
    setIsCorrectNetwork(false)
  }

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleGenerateImage = async () => {
  if (!prompt) return;
  setIsGenerating(true);

  try {
    if (!window.ethereum) {
      alert("❌ MetaMask not found!");
      setIsGenerating(false);
      return;
    }

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const senderAddress = accounts[0];

    if (!senderAddress) {
      alert("❌ Wallet not connected!");
      setIsGenerating(false);
      return;
    }

    console.log(`💳 Sender: ${senderAddress}`);

    const transactionParameters = {
      from: senderAddress,
      to: "0xCF32aF2912554af15CE51fe0fA459b76E4Ea444D", // WARD recipient address
      value: "0x" + (BigInt(GENERATION_PRICE * 10 ** 18)).toString(16), // Amount in WARD
      gas: "0x5208", // Fixed gas price
    };

    console.log("📤 Sending transaction...", transactionParameters);

    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [transactionParameters],
    });

    console.log(`✅ Transaction sent! TX: https://explorer.wardenprotocol.org/tx/${txHash}`);
    alert(`✅ Transaction sent!\nTX Hash: ${txHash}`);

    // Waiting for transaction confirmation
    await waitForTransaction(txHash);

    console.log("🖼️ Generating image...");
    await generateImage(prompt);

  } catch (error: any) {
    console.error("❌ Error during generation:", error);
    alert("Generation error: " + (error.message || "Unknown error"));
  } finally {
    setIsGenerating(false);
  }
};

// Function to wait for transaction confirmation
const waitForTransaction = async (txHash: string) => {
  while (true) {
    const receipt = await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash],
    });

    if (receipt && receipt.status === "0x1") {
      console.log(`✅ Transaction confirmed! TX: https://explorer.wardenprotocol.org/tx/${txHash}`);
      alert(`✅ Transaction confirmed!\nTX Hash: ${txHash}`);
      return;
    } else if (receipt && receipt.status === "0x0") {
      console.log(`❌ Transaction failed! TX: https://explorer.wardenprotocol.org/tx/${txHash}`);
      alert(`❌ Transaction failed!\nTX Hash: ${txHash}`);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000)); // Check every 3 seconds
  }
};

// Function to generate image via Hugging Face API
const generateImage = async (prompt: string) => {
  setIsGenerating(true);

  const API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2";
  const headers = {
    Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
    "Content-Type": "application/json",
  };

  const requestBody = JSON.stringify({ inputs: prompt });

  let attempts = 3; // Number of attempts
  while (attempts > 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 sec timeout

      const response = await fetch(API_URL, {
        method: "POST",
        headers,
        body: requestBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("🔄 Response from Hugging Face API:", response);

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const errorMessage = errorJson?.error || `Error ${response.status}: ${response.statusText}`;
        console.error("❌ Hugging Face API error:", errorMessage);

        if (response.status === 503 && attempts > 1) {
          console.warn("⏳ Server overloaded, retrying...");
          await new Promise((res) => setTimeout(res, 5000)); // Wait before retrying
          attempts--;
          continue;
        }

        throw new Error(errorMessage);
      }

      const imageBlob = await response.blob();
      const imageUrl = URL.createObjectURL(imageBlob);
      setGeneratedImage(imageUrl);

      console.log("✅ Image successfully generated!");
      break;
    } catch (error: any) {
      console.error("❌ Error during generation:", error);
      if (error.name === "AbortError") {
        console.error("⏳ Request timed out.");
      }
      attempts--;

      if (attempts === 0) {
        alert("Image generation error: " + (error.message || "Unknown error"));
      }
    } finally {
      setIsGenerating(false);
    }
  }
};


  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  useEffect(() => {
    if (isWalletConnected) {
      checkNetwork()
    }
  }, [isWalletConnected]) // Removed checkNetwork from dependencies

  return (
    <div className={`flex flex-col min-h-screen ${isDarkMode ? "bg-black" : "bg-white"}`}>
      <nav
        className={`flex justify-between items-center p-4 bg-[rgba(202,255,148,.9)] text-black sticky top-0 z-10 rounded-b-lg shadow-md`}
      >
        <div className="flex items-center space-x-2">
          <Avatar>
            <AvatarImage
              src="https://pbs.twimg.com/profile_images/1890424736359882753/NmjlHv3T_400x400.jpg"
              alt="Warden"
            />
            <AvatarFallback>WD</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold tracking-tight italic">Warden AI tool</h1>
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
            <p className="font-semibold">Price per generation: {GENERATION_PRICE} $WARD</p>
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
              className={`${isDarkMode ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-white hover:bg-gray-100 text-black"} transition-colors`}
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate"}
            </Button>
          </div>
          {!isCorrectNetwork && isWalletConnected && (
            <p className="text-red-500 text-center">
              Please switch to the Warden network to use this dApp.
              <Button
                onClick={async () => {
                  console.log("Switch Network button clicked")
                  const switched = await switchNetwork()
                  if (switched) {
                    console.log("Network switched successfully")
                    setIsCorrectNetwork(true)
                  } else {
                    console.log("Failed to switch network")
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
            <p className="text-sm font-semibold">© 2025 Warden. All Rights Reserved.</p>
          </div>
          <div className="flex space-x-6">
            <a
              href="https://twitter.com/warden_xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg hover:text-blue-500 transition-colors"
            >
              Twitter
            </a>
            <a
              href="https://github.com/warden"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg hover:text-gray-700 transition-colors"
            >
              GitHub
            </a>
            <a href="mailto:support@warden.xyz" className="text-lg hover:text-green-500 transition-colors">
              Contact
            </a>
          </div>
        </div>
        <div className="mt-4 text-center text-xs">
          <p className="text-gray-500">Powered by Warden AI Generator. Designed with ❤️ by the Warden Team.</p>
        </div>
      </footer>
    </div>
  )
}

