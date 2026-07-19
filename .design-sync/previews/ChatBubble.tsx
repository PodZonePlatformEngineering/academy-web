import { ChatBubble } from 'academy-web'

const column = { display: 'flex', flexDirection: 'column' as const, gap: 10, maxWidth: 440 }

export const Conversation = () => (
  <div style={column}>
    <ChatBubble role="system">Module 3 unlocked — Programming with AI APIs</ChatBubble>
    <ChatBubble role="user" timestamp="14:02">
      Why does my prompt work in the playground but not through the API?
    </ChatBubble>
    <ChatBubble role="tutor" timestamp="14:03 · claude-sonnet-5 · 3 passages retrieved">
      Think about what the playground sets for you silently. Which parts of the request
      do you control in code that the playground was filling in on your behalf?
    </ChatBubble>
  </div>
)

export const Streaming = () => (
  <div style={column}>
    <ChatBubble role="user" timestamp="14:05">What does temperature actually change?</ChatBubble>
    <ChatBubble role="tutor" streaming>
      Good instinct to ask — temperature shapes the sampling distribution, not the
      model's knowledge. Consider two prompts
    </ChatBubble>
  </div>
)

export const SystemPing = () => (
  <div style={column}>
    <ChatBubble role="system">
      Ask anything about Prompt Engineering — answers are grounded in your course material.
    </ChatBubble>
  </div>
)
