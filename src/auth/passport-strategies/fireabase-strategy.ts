// import { PassportStrategy } from '@nestjs/passport';
// import { Injectable, UnauthorizedException } from '@nestjs/common';
// import { Strategy, ExtractJwt } from 'passport-firebase-jwt';
// import * as firebaseConfig from '../../../firebase.config.json';
// import * as firebase from 'firebase-admin';
// import { UserType } from '../../users/enums/user.types';
// import { Customer } from '../../customers/entity/customer.entity';
// import { Repository } from 'typeorm';
// import { InjectRepository } from '@nestjs/typeorm';

// const firebase_params = {
//   type: firebaseConfig.type,
//   projectId: firebaseConfig.project_id,
//   privateKeyId: firebaseConfig.private_key_id,
//   privateKey: firebaseConfig.private_key,
//   clientEmail: firebaseConfig.client_email,
//   clientId: firebaseConfig.client_id,
//   authUri: firebaseConfig.auth_uri,
//   tokenUri: firebaseConfig.token_uri,
//   authProviderX509CertUrl: firebaseConfig.auth_provider_x509_cert_url,
//   clientC509CertUrl: firebaseConfig.client_x509_cert_url,
// };

// @Injectable()
// export class FirebaseAuthStrategy extends PassportStrategy(
//   Strategy,
//   'firebase-auth',
// ) {
//   private defaultApp: any;
//   constructor(
//     @InjectRepository(Customer)
//     private userRepository: Repository<Customer>,
//   ) {
//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//     });
//     this.defaultApp = firebase.initializeApp({
//       credential: firebase.credential.cert(firebase_params),
//     });
//   }
//   async validate(token: string) {
//     const user: any = await this.defaultApp
//       .auth()
//       .verifyIdToken(token, true)
//       .catch((err) => {
//         console.log(err);
//         throw new UnauthorizedException(err.message);
//       });
//     if (!user) {
//       throw new UnauthorizedException();
//     }
//     user.userType = UserType.CUSTOMER;
//     const customer = await this.userRepository.findOne({
//       where: {
//         phoneNumber: user.phone_number,
//       },
//     });
//     user.customer = customer;
//     return user;
//   }
// }
