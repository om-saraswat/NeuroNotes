import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GithubProvider from "next-auth/providers/github"
import mongoose from "mongoose"

/* -------------------- ENV -------------------- */

const MONGODB_URI = process.env.MONGODB_URI as string

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable")
}

/* -------------------- MONGOOSE CACHE -------------------- */

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

let cached = global._mongoose

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI)
  }

  cached.conn = await cached.promise
  return cached.conn
}

/* -------------------- USER MODEL -------------------- */

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    image: String
  },
  { timestamps: true }
)

const User =
  mongoose.models.User || mongoose.model("User", UserSchema)

/* -------------------- AUTH OPTIONS -------------------- */

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },

  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }),

    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!
    })
  ],

  pages: {
    signIn: "/login"
  },

  callbacks: {
    async jwt({ token, user }) {
      await dbConnect()

      if (user) {
        let dbUser = await User.findOne({ email: user.email })

        if (!dbUser) {
          dbUser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image
          })
        }

        token.id = dbUser._id.toString()
      } else {
        const dbUser = await User.findOne({ email: token.email })
        if (dbUser) token.id = dbUser._id.toString()
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
      }
      return session
    }
  }
}

/* -------------------- HANDLER -------------------- */

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }