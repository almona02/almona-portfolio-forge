import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const teamMembers = [
  {
    name: "MONA GOMAA",
    role: "GM & Founder",
    avatar: "/images/profiles/john-doe.jpg",
    bio: "MONA has over 40 years of experience in the industrial equipment industry and trading globally . she founded Almona with the vision of providing world-class machinery to Egyptian manufacturers.",
  },
  {
    name: "AHMED HASSAN",
    role: "Chief Operating EXECUTIVE",
    avatar: "/images/profiles/jane-smith.jpg",
    bio: "AHMED is an expert in operations and logistics. HE ensures that our customers receive their orders on time and in perfect condition.",
  },
  {
    name: "RANIA HASSAN",
    role: "Head of Sales",
    avatar: "/images/profiles/peter-jones.jpg",
    bio: "RANIA is a master negotiator and a trusted advisor to our clients. SHE helps them find the right equipment for their needs and budget.",
  },
];

export const TeamProfiles = () => {
  return (
    <div className="py-6 sm:py-8 md:py-12">
      <h2 className="typography-h2 text-xl sm:text-2xl md:text-3xl text-center mb-6 sm:mb-8 text-white px-2">Meet Our Team</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 container mx-auto px-4 sm:px-6">
        {teamMembers.map((member) => (
          <Card key={member.name} className="bg-almona-dark/60 border-almona-light/20 backdrop-blur-sm hover:border-almona-orange/50 transition-colors h-full">
            <CardHeader className="items-center text-center p-4 sm:p-5 md:p-6">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mb-3 sm:mb-4 mx-auto">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback className="text-lg sm:text-xl md:text-2xl">{member.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-base sm:text-lg md:text-xl mb-1 sm:mb-2 text-white">{member.name}</CardTitle>
              <p className="text-xs sm:text-sm md:text-base text-gray-400">{member.role}</p>
            </CardHeader>
            <CardContent className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6">
              <p className="text-center text-xs sm:text-sm md:text-base text-gray-300 leading-relaxed">{member.bio}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
