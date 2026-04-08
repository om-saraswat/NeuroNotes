import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import GithubProvider from "next-auth/providers/github"
import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable")
}

let cached = global._mongoose || { conn: null, promise: null }
if (!cached.promise) {
  cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).then(m => m.connection)
}
global._mongoose = cached

async function dbConnect() {
  if (cached.conn) return cached.conn
  cached.conn = await cached.promise
  return cached.conn
}

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  image: String
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model("User", UserSchema)

const authOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET
    })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
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
    session: async ({ session, token }) => {
      session.user.id = token.id;
      return session;
    },
    pages: {
      signIn: '/login', 
    }
  }
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }