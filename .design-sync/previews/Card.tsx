import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Button } from 'academy-web'

export const CourseCard = () => (
  <Card style={{ maxWidth: 380 }}>
    <CardHeader>
      <CardTitle>Prompt Engineering</CardTitle>
      <CardDescription>
        Nine modules from fundamentals to agentic workflows — the flagship track.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <p style={{ fontSize: 14 }}>
        Module 3 · Programming with AI APIs — 6 sections, worked example included.
      </p>
    </CardContent>
    <CardFooter style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Badge variant="secondary">Enrolled</Badge>
      <Button size="sm">Continue</Button>
    </CardFooter>
  </Card>
)

export const Compact = () => (
  <Card style={{ maxWidth: 320 }}>
    <CardHeader>
      <CardTitle>Lesson 3.06</CardTitle>
      <CardDescription>Workstation secrets with secretctl and VS Code</CardDescription>
    </CardHeader>
  </Card>
)
