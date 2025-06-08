"use client";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

interface Message {
  id: number;
  sender: "user" | "bot";
  content: string;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [cardBgColor, setCardBgColor] = useState("white");
  const [pageBgColor, setPageBgColor] = useState("#f3f4f6");
  const [isTyping, setIsTyping] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedPdfText, setParsedPdfText] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const colors = [
    { name: "White", value: "white" },
    { name: "Light Gray", value: "#f3f4f6" },
    { name: "Sky Blue", value: "#e0f2fe" },
    { name: "Lavender", value: "#e9d5ff" },
    { name: "Mint", value: "#d1fae5" },
    { name: "Peach", value: "#ffe4e6" },
    { name: "Red", value: "#FF0000" },
    { name: "Black", value: "#000000" },
    { name: "Yellow", value: "#FFFF00" },
    { name: "Orange", value: "#FFA500" },
  ];

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  const parsePDF = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const typedarray = new Uint8Array(reader.result as ArrayBuffer);
        const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;

        let fullText = "";
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(" ") + "\n";
        }

        console.log("Parsed PDF Content:\n", fullText.trim());
        setParsedPdfText(fullText.trim());
      } catch (err) {
        console.error("Error parsing PDF:", err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setUploadedFileName(file.name);
      parsePDF(file);
    } else {
      alert("Please upload a valid PDF file.");
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newUserMessage: Message = {
      id: Date.now(),
      sender: "user",
      content: input.trim(),
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    // Combine input + parsed PDF text for API
    const combinedUserContent =
      input.trim() + (parsedPdfText ? `\n\n[Context from uploaded PDF:]\n${parsedPdfText}` : "");

    const contents = [
      ...messages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })),
      {
        role: "user",
        parts: [{ text: combinedUserContent }],
      },
    ];

    try {
      const response = await fetch(
      //use your own url with API Key
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/gemini-1.5-flash",
            contents,
            generationConfig: { responseMimeType: "text/plain" },
          }),
        }
      );

      const data = await response.json();
      const botText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        "🤖 Sorry, I couldn't fetch a response.";

      const botMessage: Message = {
        id: Date.now() + 1,
        sender: "bot",
        content: botText,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          sender: "bot",
          content: "🤖 Error: Failed to fetch response from Gemini API.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") sendMessage();
  };

  const clearChat = () => {
    setMessages([]);
    setUploadedFileName(null);
    setParsedPdfText("");
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen px-4"
      style={{ backgroundColor: pageBgColor }}
    >
      <Card
        className="w-full max-w-2xl h-[80vh] flex flex-col"
        style={{ backgroundColor: cardBgColor }}
      >
        <div className="p-4 border-b bg-background flex justify-between items-center">
          <h1 className="text-xl font-semibold">My Chatbot</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm mr-2">Card BG:</label>
            <select
              value={cardBgColor}
              onChange={(e) => setCardBgColor(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              {colors.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.name}
                </option>
              ))}
            </select>
            <label className="text-sm ml-4 mr-2">Page BG:</label>
            <select
              value={pageBgColor}
              onChange={(e) => setPageBgColor(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              {colors.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.name}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={clearChat}>
              Clear Chat
            </Button>
          </div>
        </div>

        <CardContent className="flex-1 overflow-hidden p-4">
          <ScrollArea className="h-full pr-4">
            <div className="flex flex-col space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-xl px-4 py-2 max-w-[80%] text-sm whitespace-pre-line ${
                    msg.sender === "user"
                      ? "bg-primary text-white self-end"
                      : "bg-secondary text-blue-600 self-start"
                  }`}
                >
                  {msg.content}
                </motion.div>
              ))}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="self-start text-sm text-blue-500"
                >
                  Typing...
                </motion.div>
              )}
              {uploadedFileName && (
                <div className="text-xs text-gray-500">
                  📄 1 file uploaded: <strong>{uploadedFileName}</strong>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <div className="flex items-center gap-2 p-4 border-t bg-background">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            hidden
            onChange={handleFileUpload}
          />
          <Button onClick={() => fileInputRef.current?.click()}>Upload PDF</Button>
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </Card>
    </div>
  );
}
