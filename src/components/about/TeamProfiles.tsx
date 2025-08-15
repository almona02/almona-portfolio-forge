import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const teamMembers = [
  {
    name: "John Doe",
    role: "CEO & Founder",
    avatar: "/images/profiles/john-doe.jpg",
    bio: "John has over 20 years of experience in the industrial equipment industry. He founded Almona with the vision of providing world-class machinery to Egyptian manufacturers.",
  },
  {
    name: "Jane Smith",
    role: "Chief Operating Officer",
    avatar: "/images/profiles/jane-smith.jpg",
    bio: "Jane is an expert in operations and logistics. She ensures that our customers receive their orders on time and in perfect condition.",
  },
  {
    name: "Peter Jones",
    role: "Head of Sales",
    avatar: "/images/profiles/peter-jones.jpg",
    bio: "Peter is a master negotiator and a trusted advisor to our clients. He helps them find the right equipment for their needs and budget.",
  },
];

export const TeamProfiles = () => {
  return (
    <div className="py-12">
      <h2 className="text-3xl font-bold text-center mb-8">Meet Our Team</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {teamMembers.map((member) => (
          <Card key={member.name}>
            <CardHeader className="items-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <CardTitle>{member.name}</CardTitle>
              <p className="text-muted-foreground">{member.role}</p>
            </CardHeader>
            <CardContent>
              <p className="text-center">{member.bio}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
