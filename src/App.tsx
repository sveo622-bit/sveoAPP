import { Send, User, MessageCircle, Hash } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Message } from "./types";

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [name, setName] = useState(() => localStorage.getItem("chat_name") || "Аноним");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(name);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial messages
  useEffect(() => {
    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch((err) => console.error("Failed to load messages", err));
  }, []);

  // Set up Server-Sent Events for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.onmessage = (event) => {
      const newMessage = JSON.parse(event.data);
      setMessages((prev) => [...prev, newMessage]);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNameSave = () => {
    const newName = tempName.trim() || "Аноним";
    setName(newName);
    localStorage.setItem("chat_name", newName);
    setIsEditingName(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const textToSend = inputText;
    setInputText(""); // Optimistic clear

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, text: textToSend }),
      });
    } catch (err) {
      console.error("Failed to send message", err);
      // Ideally handle error (e.g. restore input text)
      setInputText(textToSend);
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div 
      className="flex h-screen font-sans md:p-6 lg:p-8 justify-center items-center relative overflow-hidden bg-[#0f172a]"
      style={{ background: "radial-gradient(circle at top left, #312e81, #0f172a)" }}
    >
      {/* Background blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-indigo-500 rounded-full blur-[80px] opacity-40"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-pink-500 rounded-full blur-[80px] opacity-40"></div>
      </div>

      <div className="flex flex-col w-full max-w-3xl z-10 h-full max-h-[768px] relative overflow-hidden ring-1 ring-white/15 md:rounded-[24px] bg-white/5 backdrop-blur-[20px] shadow-2xl">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 h-[70px] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shrink-0">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[18px] font-medium text-white leading-tight">Общий чат</h1>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
              <p className="text-sm text-white/50">Публичная комната</p>
            </div>
          </div>

          {/* User Settings */}
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                  className="px-3 py-1.5 text-sm border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/10 text-white placeholder-white/50 w-32"
                  placeholder="Ваше имя"
                  autoFocus
                />
                <button
                  onClick={handleNameSave}
                  className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition-colors"
                >
                  Ок
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm font-medium text-white/90 group"
                title="Изменить имя"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-400 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                  <User className="w-4 h-4" />
                </div>
                <span className="max-w-[100px] truncate">{name}</span>
              </button>
            )}
          </div>
        </header>

        {/* Messages Layout (Telegram-styled) */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/50 space-y-3">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center shadow-sm">
                <MessageCircle className="w-8 h-8 text-white/40" />
              </div>
              <p className="text-sm font-medium text-white/60 bg-white/10 px-4 py-2 rounded-full shadow-sm">Сообщений пока нет. Напишите первым!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMine = msg.name === name;
              const showName = !isMine && (idx === 0 || messages[idx - 1].name !== msg.name);
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[85%] sm:max-w-[70%] ${isMine ? "ml-auto" : "mr-auto"}`}
                >
                  <div className={`relative px-4 py-3 text-[14px] leading-relaxed break-words max-w-full ${
                    isMine 
                      ? "bg-indigo-600/40 text-white/90 rounded-2xl rounded-tr-sm border border-white/20" 
                      : "bg-white/10 text-white/90 rounded-2xl rounded-tl-sm"
                  }`}>
                    {showName && (
                      <span className="block text-xs font-semibold text-indigo-400 mb-1">
                        {msg.name}
                      </span>
                    )}
                    <span className="whitespace-pre-wrap">{msg.text}</span>
                    <span className={`inline-block translate-y-[2px] ml-3 text-[11px] select-none ${isMine ? "text-white/60" : "text-white/50"}`}>
                      {formatTime(msg.timestamp)} {isMine && "✓✓"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} className="h-1 saturate-0" />
        </div>

        {/* Input Area */}
        <form 
          onSubmit={handleSendMessage}
          className="flex flex-col px-4 md:px-6 py-4 justify-center border-t border-white/10 min-h-[80px] shrink-0"
        >
          <div className="flex items-end gap-2 bg-white/10 rounded-[12px] border border-white/10 p-1 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Напишите сообщение..."
              className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none py-2.5 px-3 focus:outline-none text-[14px] text-white placeholder-white/40 scrollbar-thin overflow-y-auto"
              rows={1}
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2.5 m-0.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-[10px] transition-colors flex shrink-0 items-center justify-center"
              title="Отправить (Enter)"
            >
              Отправить
            </button>
          </div>
          <p className="text-center mt-2 text-[11px] text-white/30 select-none">
            Shift + Enter для переноса строки
          </p>
        </form>

      </div>
    </div>
  );
}
