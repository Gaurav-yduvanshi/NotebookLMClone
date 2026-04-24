import { generateToken } from "@/app/helper/jwt";
import { User } from "@/app/models/userSchema";
import { GoogleUserType } from "@/types/user-types";


export class UserRepository {
    private static instance: UserRepository;

// Singleton pattern to ensure only one instance of UserRepository
    public static getInstance(): UserRepository {
        if (!UserRepository.instance) {
            UserRepository.instance = new UserRepository();
        }

        return UserRepository.instance;
    }


    

    async createUser(userProps: GoogleUserType, token:{accessToken:string, refreshToken:string}) {

        const {sub:id, name, picture, email} = userProps?._json;

        const existingUser = await User.findOne({email: email});
        if(!existingUser){
        const user = new User({
            name: name,
            email: email,
            image: picture,
            googleAccessToken: token?.accessToken,
            googleRefreshToken: token?.refreshToken,
            googleId: id


        });

        const newUser = await user.save();
        const { accessToken, refreshToken } = await generateToken(newUser._id);

        return {
            authData:{
                ...newUser.toObject(), token:{accessToken, refreshToken}
            }
        }

    }else{
        existingUser.name = name;
        existingUser.image = picture;
        existingUser.googleId = id;
        existingUser.googleAccessToken = token?.accessToken;
        if (token?.refreshToken) {
            existingUser.googleRefreshToken = token.refreshToken;
        }
        const updatedUser = await existingUser.save();

        const { accessToken, refreshToken } = await generateToken(updatedUser?._id);
        return{
            authData:{
                ...updatedUser.toObject(), token:{accessToken, refreshToken}
            }
        }
    }

    }
}