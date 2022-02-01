import { enumType, objectType, stringArg, extendType, nonNull, arg } from 'nexus';
import { databaseEnumToServerEnum } from './Pipeline';
import { getUserId } from '../utils';
import { Context } from '../context';


export const LicenseChange = objectType({
  name: 'LicenseChange',
  sourceType: {
    module: '@prisma/client',
    export: 'LicenseChange',
  },
  definition(t) {
    t.nonNull.string('id')
    t.nonNull.field('pipeline', {
      type: 'Pipeline',
      resolve: async ({ id }, _args, ctx: Context) => {
        const result = await ctx.prisma.licenseChange.findUnique({
          where: { id },
        }).pipeline();
        return result!
      },
    })
    t.nonNull.field('status', {
      type: 'StatusEnum',
      resolve: ({ status }) => {
        const result = StatusEnumMembers[status] as keyof typeof StatusEnumMembers;
        return result;
      }
    })
    t.nonNull.field('date', { type: 'DateTime' })
    t.string('linkToDocumentation')
    t.nonNull.field('createdBy', {
      type: 'User',
      resolve: async ({ id }, _args, ctx: Context) => {
        const result = await ctx.prisma.licenseChange.findUnique({
          where: { id },
        }).createdBy();
        return result!
      },
    })
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.field('updatedBy', {
      type: 'User',
      resolve: async ({ id }, _args, ctx: Context) => {
        const result = await ctx.prisma.licenseChange.findUnique({
          where: { id },
        }).updatedBy();
        return result!
      },
    })
    t.nonNull.field('updatedAt', { type: 'DateTime' })
  },
});


export const StatusEnumMembers = {
  Operating: "Operating",
  Discontinued: "Discontinued",
  Abandoned: "Abandoned",
  Removed: "Removed",
  ToBeConstructed: "To Be Constructed",
  Active: "Active",
  Cancelled: "Cancelled",
  New: "New",
  NotConstructed: "Not Constructed"
}

export const StatusEnum = enumType({
  sourceType: {
    module: '@prisma/client',
    export: 'StatusEnum',
  },
  name: 'StatusEnum',
  members: StatusEnumMembers
});


export const LicenseChangeQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('licenseChangesByPipelineId', {
      type: 'LicenseChange',
      args: {
        pipelineId: stringArg(),
      },
      resolve: async (_parent, { pipelineId }, ctx: Context) => {
        if (pipelineId) {
          return ctx.prisma.licenseChange.findMany({
            where: { pipelineId },
            orderBy: { createdAt: 'desc' },
          })
        } else {
          return ctx.prisma.licenseChange.findMany({
            orderBy:
              { createdAt: 'desc' },
          })
        }
      }
    })
  }
})


export const LicenseChangeMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('editLicenseChange', {
      type: 'LicenseChange',
      args: {
        id: nonNull(stringArg()),
        pipelineId: stringArg(),
        status: arg({ type: 'StatusEnum' }),
        date: arg({ type: 'DateTime' }),
        linkToDocumentation: stringArg(),
      },
      resolve: async (_parent, args, ctx: Context) => {
        const userId = getUserId(ctx);
        return ctx.prisma.licenseChange.update({
          where: { id: args.id },
          data: {
            pipelineId: args.pipelineId || undefined,
            status: databaseEnumToServerEnum(StatusEnumMembers, args.status) || undefined,
            date: args.date || undefined,
            linkToDocumentation: args.linkToDocumentation || undefined,
            updatedById: String(userId),
          },
        })
      },
    })
    t.field('addLicenseChange', {
      type: 'LicenseChange',
      args: {
        pipelineId: nonNull(stringArg()),
      },
      resolve: (_parent, { pipelineId }, ctx: Context) => {
        const userId = getUserId(ctx);
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return ctx.prisma.licenseChange.create({
          data: {
            pipelineId,
            date,
            createdById: String(userId),
            updatedById: String(userId),
          }
        })
      }
    })
    t.field('deleteLicenseChange', {
      type: 'LicenseChange',
      args: {
        id: nonNull(stringArg()),
      },
      resolve: (_parent, { id }, ctx: Context) => {
        return ctx.prisma.licenseChange.delete({
          where: { id }
        })
      }
    })
  }
});