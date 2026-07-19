import { ChatComposer } from 'academy-web'

const noop = () => {}

export const Empty = () => (
  <ChatComposer
    style={{ maxWidth: 480 }}
    value=""
    onValueChange={noop}
    onSend={noop}
    placeholder="Ask about Prompt Engineering…"
    hint="Enter to send · Shift+Enter for a new line"
  />
)

export const ReadyToSend = () => (
  <ChatComposer
    style={{ maxWidth: 480 }}
    value="What does temperature actually change?"
    onValueChange={noop}
    onSend={noop}
  />
)

export const Busy = () => (
  <ChatComposer
    style={{ maxWidth: 480 }}
    value=""
    onValueChange={noop}
    onSend={noop}
    busy
    placeholder="Ask about Prompt Engineering…"
  />
)
