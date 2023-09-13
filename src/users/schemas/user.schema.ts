import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, trim: true })
    email: string;

    @Prop({ required: true, trim: true })
    token: string;

    @Prop({ required: true, default: true })
    is_active?: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
