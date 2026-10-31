import {betterAuth} from 'better-auth';
import {organization,twoFactor} from 'better-auth/plugins';
import {getMigrations} from 'better-auth/db/migration';
import nodemailer from 'nodemailer';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
export function smtpOptions(config){
  const url=new URL(config.smtpUrl);
  return {host:url.hostname,port:Number(url.port||(url.protocol==='smtps:'?465:587)),secure:url.protocol==='smtps:',requireTLS:!(config.local&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)),tls:{rejectUnauthorized:true},...(url.username?{auth:{user:decodeURIComponent(url.username),pass:decodeURIComponent(url.password)}}:{})};
}
export function createDelivery(config,deliver) {
  const transport=config.smtpUrl?nodemailer.createTransport(smtpOptions(config),{from:config.smtpFrom}):null;
  const send=deliver??(async({to,subject,text})=>{
    if(transport){await transport.sendMail({from:config.smtpFrom,to,subject,text,requireTLS:!config.local});return;}
    if(!config.local)throw new Error('Email delivery is not configured.');
    // A private development outbox, never served by HTTP or printed into logs.
    await mkdir('./data/outbox',{recursive:true,mode:0o700});
    await writeFile('./data/outbox/'+randomUUID()+'.json',JSON.stringify({to,subject,text},null,2),{mode:0o600});
  });
  return send;
}
export function createAuth(config, db, deliver, {migrating=false}={}) {
  const send=createDelivery(config,deliver);
  return betterAuth({
    appName:'PixlPrfct',baseURL:config.baseURL,secret:config.secret,database:db.connection,
    trustedOrigins:[config.baseURL],
    emailAndPassword:{enabled:true,minPasswordLength:12,maxPasswordLength:128,requireEmailVerification:true,disableSignUp:!config.registration,revokeSessionsOnPasswordReset:true,
      sendResetPassword:async({user,url})=>send({to:user.email,subject:'Reset your PixlPrfct password',text:`Reset your password: ${url}\n\nIf you did not request this, ignore this message.`})},
    emailVerification:{sendOnSignUp:true,sendOnSignIn:true,autoSignInAfterVerification:true,expiresIn:3600,
      sendVerificationEmail:async({user,url})=>send({to:user.email,subject:'Verify your PixlPrfct email',text:`Verify your email address: ${url}\n\nThis link expires in one hour.`})},
    session:{expiresIn:60*60*24*7,updateAge:60*60*24,freshAge:60*10,cookieCache:{enabled:false}},
    advanced:{useSecureCookies:!config.local,ipAddress:{ipAddressHeaders:['x-pixl-client-ip']},database:{generateId:'uuid',validateSchema:!migrating},defaultCookieAttributes:{httpOnly:true,sameSite:'lax',secure:!config.local}},
    rateLimit:{enabled:true,storage:'database',window:60,max:100,customRules:{'/sign-in/email':{window:60,max:10},'/sign-up/email':{window:300,max:5},'/request-password-reset':{window:300,max:5},'/send-verification-email':{window:300,max:5},'/two-factor/*':{window:60,max:10}}},
    plugins:[organization({teams:{enabled:true},requireEmailVerificationOnInvitation:true,
      sendInvitationEmail:async data=>send({to:data.email,subject:`Invitation to ${data.organization.name} on PixlPrfct`,text:`You have been invited to ${data.organization.name}.\n\nSign in or create an account with this email address, then accept your invitation: ${config.baseURL}/account?invitation=${encodeURIComponent(data.id)}`})}),twoFactor({issuer:'PixlPrfct'})],
  });
}
export async function migrateAuth(auth) {const migration=await getMigrations(auth.options);await migration.runMigrations();}
