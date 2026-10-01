<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Validator;
use App\Services\ProfileService;

/** Profile module — always scoped to the authenticated user. */
final class ProfileController extends Controller
{
    private ProfileService $profile;

    public function __construct()
    {
        $this->profile = new ProfileService();
    }

    /** GET /api/v1/profile */
    public function show(Request $request): Response
    {
        return Response::success($this->profile->get((int) $this->user($request)['id']));
    }

    /** PUT /api/v1/profile */
    public function update(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'name'     => 'required|string|min:2|max:120',
            'email'    => 'required|email|max:190',
            'company'  => 'string|max:160',
            'country'  => 'string|max:80',
            'timezone' => 'string|max:64',
            'language' => 'string|max:32',
            'phone'    => 'string|max:32',
        ]);

        $fresh = $this->profile->update((int) $this->user($request)['id'], $data);

        return Response::success($fresh, 'Profile updated.');
    }

    /** POST /api/v1/profile/photo  { image: base64, mime: string } */
    public function uploadPhoto(Request $request): Response
    {
        $data = Validator::validate($request->all(), [
            'image' => 'required|string',
            'mime'  => 'required|string|max:40',
        ]);

        $result = $this->profile->setPhoto(
            (int) $this->user($request)['id'],
            $data['image'],
            $data['mime'],
        );

        return Response::success($result, 'Profile photo updated.');
    }

    /** DELETE /api/v1/profile/photo */
    public function deletePhoto(Request $request): Response
    {
        $this->profile->deletePhoto((int) $this->user($request)['id']);

        return Response::success(null, 'Profile photo removed.');
    }
}
