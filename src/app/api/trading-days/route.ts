import {NextResponse} from 'next/server';import prisma from '@/lib/db/prisma';import {getAuthenticatedAccount} from '@/lib/auth/session';
export const dynamic = 'force-dynamic';
export async function GET(){const {error,account}=await getAuthenticatedAccount();if(error)return error;const days=await prisma.tradingDay.findMany({where:{accountId:account!.id},orderBy:{date:'desc'}});return NextResponse.json({success:true,data:days})}
