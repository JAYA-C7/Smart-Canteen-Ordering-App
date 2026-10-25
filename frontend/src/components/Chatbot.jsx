import { useState, useEffect, useRef } from 'react'

function Chatbot() {
    const [isOpen, setIsOpen] = useState(false)
    const [message, setMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef(null)
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: 'Hello! Welcome to Smart Canteen. How can I help you today?',
            sender: 'bot'
        }
    ])
// Automatically scroll to the latest chat message
useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
    })
}, [messages, isLoading])
    // Send the student's question to the backend chatbot API
    async function handleSendMessage(event) {
        event.preventDefault()

        const trimmedMessage = message.trim()

        if (!trimmedMessage || isLoading) {
            return
        }

        const userMessage = {
            id: Date.now(),
            text: trimmedMessage,
            sender: 'user'
        }

        setMessages((previousMessages) => [
            ...previousMessages,
            userMessage
        ])

        setMessage('')
        setIsLoading(true)

        try {
            const response = await fetch(
                'http://localhost:3000/api/chatbot',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: trimmedMessage
                    })
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to get a response.'
                )
            }

            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    id: Date.now() + 1,
                    text: data.reply,
                    sender: 'bot'
                }
            ])
        } catch (error) {
            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    id: Date.now() + 1,
                    text: 'Sorry, I could not connect to the canteen assistant. Please try again.',
                    sender: 'bot'
                }
            ])

            console.error('Chatbot API error:', error.message)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="chatbot-container">
            <button
                type="button"
                className="chatbot-toggle"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? 'Close Chat' : '💬 Chat with us'}
            </button>

            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <h3>Smart Canteen Assistant</h3>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close chatbot"
                        >
                            ×
                        </button>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((chatMessage) => (
                            <p
                                key={chatMessage.id}
                                className={`chatbot-message chatbot-message-${chatMessage.sender}`}
                            >
                                {chatMessage.text}
                            </p>
                        ))}

                        {isLoading && (
                            <p className="chatbot-message chatbot-message-bot">
                                Checking the menu...
                            </p>
                        )}
                          <div ref={messagesEndRef} />
                    </div>

                    <form
                        className="chatbot-input-area"
                        onSubmit={handleSendMessage}
                    >
                        <input
                            type="text"
                            value={message}
                            onChange={(event) =>
                                setMessage(event.target.value)
                            }
                            placeholder="Ask me something..."
                            aria-label="Type your message"
                            disabled={isLoading}
                        />

                        <button
                            type="submit"
                            disabled={!message.trim() || isLoading}
                        >
                            {isLoading ? 'Sending...' : 'Send'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}

export default Chatbot