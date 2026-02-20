'use client'

import { User, MapPin, Link as LinkIcon, Calendar } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Profile, UserRole } from '@/lib/supabase/database.types'

interface ProfileCardProps {
  profile: Profile
  showEmail?: boolean
  showStats?: boolean
}

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-500',
  moderator: 'bg-blue-500',
  user: 'bg-green-500',
  guest: 'bg-gray-500',
}

export function ProfileCard({
  profile,
  showEmail = false,
  showStats = true
}: ProfileCardProps) {
  const initials = profile.display_name
    ? profile.display_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile.email[0].toUpperCase()

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <Avatar className="mx-auto h-24 w-24">
          <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || 'User'} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="mt-4 space-y-1">
          <h2 className="text-xl font-semibold">
            {profile.display_name || 'Anonymous User'}
          </h2>
          {showEmail && (
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          )}
          <Badge variant="secondary" className="mt-2">
            <span
              className={`mr-1 h-2 w-2 rounded-full ${roleColors[profile.role]}`}
            />
            {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.bio && (
          <p className="text-sm text-muted-foreground">{profile.bio}</p>
        )}

        <div className="space-y-2 text-sm text-muted-foreground">
          {profile.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
          )}

          {profile.website_url && (
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {profile.website_url}
              </a>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Joined {formatDate(profile.created_at)}</span>
          </div>
        </div>

        {showStats && (
          <div className="grid grid-cols-3 gap-4 border-t pt-4 text-center">
            <div>
              <div className="text-2xl font-bold">0</div>
              <div className="text-xs text-muted-foreground">Posts</div>
            </div>
            <div>
              <div className="text-2xl font-bold">0</div>
              <div className="text-xs text-muted-foreground">Comments</div>
            </div>
            <div>
              <div className="text-2xl font-bold">0</div>
              <div className="text-xs text-muted-foreground">Points</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
