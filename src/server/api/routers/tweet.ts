import type { Prisma } from "@prisma/client";
import type{ inferAsyncReturnType } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  createTRPCContext,
} from "~/server/api/trpc";

export const tweetRouter = createTRPCRouter({
  infiniteProfileFeed: publicProcedure
  .input(
    z.object({
      userId: z.string(),
      limit: z.number().optional(),
      cursor: z.object({id: z.string(), createdAt: z.date()}).optional(),
    })
    ).query(
      async ({input : {limit = 10, userId, cursor}, ctx}) => {
        const currentUserId = ctx.session?.user.id;
        return await getInfiniteTweets({
          
          ctx, 
          limit, 
          cursor,
          whereClause: { userId}  });
    }
    ),
  infiniteFeed: publicProcedure
  .input(
    z.object({
      onlyFollowing: z.boolean().optional(),
      limit: z.number().optional(),
      cursor: z.object({id: z.string(), createdAt: z.date()}).optional(),
    })
    ).query(
      async ({input : {limit = 10, onlyFollowing = false, cursor}, ctx}) => {
        const currentUserId = ctx.session?.user.id;
        return await getInfiniteTweets({whereClause: currentUserId  == null || !onlyFollowing ? undefined : 
          {
            user: {
              followers: { some: {id: currentUserId}},
            }
          }, ctx, limit, cursor });
    }
    ),


  create: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({input : {content}, ctx}) => {
      const tweet = await ctx.prisma.tweet.create({ 
        data : {content, userId: ctx.session.user.id}});


  void ctx.revalidateSSG?.(`/profiles/${ctx.session.user.id}`);
        return tweet;
    }),
  toggleLike: protectedProcedure
  .input(z.object({id: z.string()}))
  .mutation(async({input: {id}, ctx}) => {
    const data = {tweetId: id, userId: ctx.session.user.id}
    const existingTweet =await ctx.prisma.like.findUnique({
      where: {userId_tweetId: data}
    })

    if(existingTweet == null) {
      await ctx.prisma.like.create({data})
      return {addedLike: true}
    } else {
      await ctx.prisma.like.delete({where: {userId_tweetId: data}})
            return {addedLike: false}
    }
  })

});


async function getInfiniteTweets({
  whereClause,
  ctx,
  limit,
  cursor
}: {whereClause?: Prisma.TweetWhereInput, limit: number, cursor: {id: string, createdAt: Date} | undefined,  ctx:inferAsyncReturnType<typeof createTRPCContext>}) {
  
      const currentUserId = ctx.session?.user.id

      const data = await ctx.prisma.tweet.findMany({
        take: limit +1,
        cursor: cursor ? {createdAt_id : cursor} : undefined,
        orderBy: [{createdAt: "desc"}, { id: "desc"}],
        where: whereClause,
        select: {
          id: true,
          content: true,
          createdAt: true,
          _count: { select: { likes: true}},
          likes: currentUserId == null ? false : { where: { userId: currentUserId}},
          user: {
            select: { name: true, id: true, image: true}
          }
        }
      });
      let nextCursor: typeof cursor | undefined
      if (data.length > limit) {
        const nextItem = data.pop()
        if(nextItem != null){
        nextCursor = {id: nextItem.id, createdAt: nextItem.createdAt}}
      }
      return {tweets: data.map(tweet =>{
        return {
          id: tweet.id,
          content: tweet.content,
          createdAt: tweet.createdAt,
          likeCount: tweet._count.likes,
          user: tweet.user,
          likedByMe: tweet.likes?.length > 0,
        };
      }), 
      nextCursor
    }
}