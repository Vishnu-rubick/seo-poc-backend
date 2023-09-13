import { Injectable, NotFoundException } from '@nestjs/common';
import { User, UserDocument } from './schemas/user.schema';
import { FilterQuery, Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class UsersService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

    async findOne(filterQuery: FilterQuery<User>): Promise<User | null> {
        return await this.userModel.findOne(filterQuery).exec();
    }

    async createUser(user: User) {
        return await this.userModel.create(user);
    }
}
