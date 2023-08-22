import { GetObjectCommand, S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Req, Res } from '@nestjs/common';
import * as AWS from 'aws-sdk';

@Injectable()
export class S3Service {
    AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;

    s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
    });

    async uploadFile(data, path) {
        return await this.s3_upload(data.buffer, this.AWS_BUCKET_NAME, path, data.mimetype);
    }

    async s3_upload(file, bucket, name, mimetype?) {
        const params = {
            Bucket: bucket,
            Key: String(name),
            Body: file,
            // ACL: "public-read",
            ResponseContentDisposition: 'attachment',
            CreateBucketConfiguration: {
                LocationConstraint: 'us-east-1',
            },
        };

        try {
            let s3Response = await this.s3.upload(params).promise();
            return s3Response;
        } catch (e) {
            console.log(e);
            return e;
        }
    }

    async downloadFile(key) {
        const client = new S3Client({});
        const command = new GetObjectCommand({
            Bucket: this.AWS_BUCKET_NAME,
            Key: key,
        });
        const response = await client.send(command);
        // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.

        const str = await response.Body.transformToString();
        return str;
    }

    async getObjectUsingSignedUrl(key: string, time: number = 300) {
        const client = new S3Client({});
        const command = new GetObjectCommand({
            Bucket: this.AWS_BUCKET_NAME,
            Key: key,
        });

        return getSignedUrl(client, command, {expiresIn: time});
    }

    async deleteFilesFromS3(key: string) {
        const params = {
            Bucket: this.AWS_BUCKET_NAME,
            Key: key,
        };

        try {
            const promise = new Promise((resolve, reject) => {
                this.s3.deleteObject(params, function (error, data) {
                    if (error) {
                        console.log(error);
                        reject({ status_code: 500, message: error });
                    }
                    resolve({ status_code: 200, message: 'File deleted successfully' });
                });
            }).catch((error) => {
                return { status_code: 500, message: error };
            });

            return promise;
        } catch (error) {
            return { status_code: 500, message: error };
        }
    }
}
