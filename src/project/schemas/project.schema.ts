import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

export type DomainInfoType = {
    domain: string;
    industry_id: Types.ObjectId;
    geography_id: Types.ObjectId;
    competitors: string[];
    projectId: string;
}

@Schema({ timestamps: true })
export class Project {
    @Prop({ required: true, ref: 'User' })
    user_id: Types.ObjectId;

    @Prop({ default: true })
    is_active?: boolean;

    @Prop({ required: true, ref: 'User' })
    updated_by: Types.ObjectId;

    @Prop()
    crawl_frequency: number;

    @Prop()
    crawl_limit: number;

    @Prop()
    is_exclude_subdomains: boolean;

    @Prop({ lowercase: true })
    name: string;

    @Prop({ lowercase: true })
    domain: string;

    @Prop({ lowercase: true })
    industry_id: string;

    @Prop({ lowercase: true })
    geography_id: string;

    @Prop({ lowercase: true })
    competitors: string[];

    @Prop()
    semProjectId: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
